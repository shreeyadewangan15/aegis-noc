"""
NetworkX Graph Topology Engine
Maintains Underlay and Overlay multi-graphs, computes paths, and performs Blast-Radius failure impact analysis.
"""

import json
import logging
from typing import Dict, Any, List, Optional, Set
import networkx as nx
from app.core.config import TOPOLOGY_FILE_PATH

logger = logging.getLogger("TopologyEngine")

class TopologyEngine:
    def __init__(self):
        self.raw_topology: Dict[str, Any] = {}
        self.underlay_graph: nx.Graph = nx.Graph()
        self.overlay_graph: nx.Graph = nx.Graph()
        self.combined_graph: nx.MultiGraph = nx.MultiGraph()
        self.load_topology()

    def load_topology(self):
        try:
            with open(TOPOLOGY_FILE_PATH, "r", encoding="utf-8") as f:
                self.raw_topology = json.load(f)
            self._build_graphs()
            logger.info(f"Loaded topology: {len(self.raw_topology.get('nodes', []))} nodes, {len(self.raw_topology.get('links', []))} links.")
        except Exception as e:
            logger.error(f"Failed to load topology from {TOPOLOGY_FILE_PATH}: {e}")
            raise e

    def _build_graphs(self):
        self.underlay_graph.clear()
        self.overlay_graph.clear()
        self.combined_graph.clear()

        # Add nodes with metadata
        for node in self.raw_topology.get("nodes", []):
            node_id = node["id"]
            site = next((s for s in self.raw_topology.get("sites", []) if s["id"] == node.get("site_id")), None)
            node_attrs = {
                "id": node_id,
                "hostname": node["hostname"],
                "role": node["role"],
                "site_id": node.get("site_id"),
                "site_name": site["name"] if site else "Unknown",
                "site_type": site["type"] if site else "Unknown",
                "loopback_ip": node["loopback_ip"],
                "system_asn": node["system_asn"],
                "device_model": node["device_model"],
                "interfaces": node.get("interfaces", []),
                "bgp_peers": node.get("bgp_peers", []),
                "geo": site.get("geo") if site else {"lat": 0, "lng": 0, "city": "N/A"}
            }
            self.underlay_graph.add_node(node_id, **node_attrs)
            self.overlay_graph.add_node(node_id, **node_attrs)
            self.combined_graph.add_node(node_id, **node_attrs)

        # Add links
        for link in self.raw_topology.get("links", []):
            link_id = link["id"]
            src = link["source"]
            tgt = link["target"]
            layer = link.get("layer", "UNDERLAY")

            link_attrs = {
                "id": link_id,
                "name": link["name"],
                "layer": layer,
                "source": src,
                "target": tgt,
                "source_interface": link.get("source_interface"),
                "target_interface": link.get("target_interface"),
                "capacity_mbps": link.get("capacity_mbps", 1000),
                "cost": link.get("cost", 10),
                "sla_latency_threshold_ms": link.get("sla_latency_threshold_ms", 30.0),
                "sla_jitter_threshold_ms": link.get("sla_jitter_threshold_ms", 5.0),
                "sla_loss_threshold_pct": link.get("sla_loss_threshold_pct", 0.1),
                "underlay_path": link.get("underlay_path")
            }

            self.combined_graph.add_edge(src, tgt, key=link_id, **link_attrs)
            if layer == "UNDERLAY":
                self.underlay_graph.add_edge(src, tgt, **link_attrs)
            elif layer == "OVERLAY":
                self.overlay_graph.add_edge(src, tgt, **link_attrs)

    def get_raw_topology(self) -> Dict[str, Any]:
        return self.raw_topology

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        return next((n for n in self.raw_topology.get("nodes", []) if n["id"] == node_id), None)

    def get_link(self, link_id: str) -> Optional[Dict[str, Any]]:
        return next((l for l in self.raw_topology.get("links", []) if l["id"] == link_id), None)

    def compute_shortest_path(self, source_id: str, target_id: str, layer: str = "UNDERLAY", weight: str = "cost") -> Dict[str, Any]:
        graph = self.overlay_graph if layer.upper() == "OVERLAY" else self.underlay_graph
        if not graph.has_node(source_id) or not graph.has_node(target_id):
            return {"found": False, "error": "Source or target node not in graph"}

        try:
            path = nx.shortest_path(graph, source=source_id, target=target_id, weight=weight)
            length = nx.shortest_path_length(graph, source=source_id, target=target_id, weight=weight)
            
            # Extract links traversed
            traversed_links = []
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                edge_data = graph.get_edge_data(u, v)
                traversed_links.append(edge_data.get("id"))

            return {
                "found": True,
                "layer": layer,
                "source": source_id,
                "target": target_id,
                "path_nodes": path,
                "path_links": traversed_links,
                "total_cost": length,
                "hop_count": len(path) - 1
            }
        except nx.NetworkXNoPath:
            return {"found": False, "error": f"No {layer} path between {source_id} and {target_id}"}

    def compute_blast_radius(self, failed_entity_id: str) -> Dict[str, Any]:
        """
        Computes the impact of a failed Node or Link on the entire SD-WAN over MPLS enterprise.
        Identifies:
        - Downstream isolated sites/nodes
        - Severed Overlay IPSec tunnels
        - Secondary failover reroutes
        - Affected business critical branches
        """
        is_node = failed_entity_id in self.underlay_graph.nodes
        is_link = any(l["id"] == failed_entity_id for l in self.raw_topology.get("links", []))

        if not is_node and not is_link:
            return {"error": f"Entity '{failed_entity_id}' not found in topology"}

        # Simulate graph without the entity
        sim_underlay = self.underlay_graph.copy()
        sim_overlay = self.overlay_graph.copy()
        
        impacted_nodes: Set[str] = set()
        severed_overlay_tunnels: List[Dict[str, Any]] = []
        rerouted_overlay_tunnels: List[Dict[str, Any]] = []
        isolated_sites: List[str] = []

        if is_node:
            impacted_nodes.add(failed_entity_id)
            node_data = self.get_node(failed_entity_id)
            
            # Check overlay tunnels that terminate at this node or traverse this underlay node
            for link in self.raw_topology.get("links", []):
                if link.get("layer") == "OVERLAY":
                    if link["source"] == failed_entity_id or link["target"] == failed_entity_id:
                        severed_overlay_tunnels.append({
                            "link_id": link["id"],
                            "name": link["name"],
                            "reason": f"Directly attached to failed node {failed_entity_id}"
                        })
                    elif link.get("underlay_path") and failed_entity_id in link["underlay_path"]:
                        severed_overlay_tunnels.append({
                            "link_id": link["id"],
                            "name": link["name"],
                            "reason": f"Underlay path traverses failed node {failed_entity_id}"
                        })

            sim_underlay.remove_node(failed_entity_id)
            if sim_overlay.has_node(failed_entity_id):
                sim_overlay.remove_node(failed_entity_id)

        elif is_link:
            link_data = self.get_link(failed_entity_id)
            src, tgt = link_data["source"], link_data["target"]
            if link_data.get("layer") == "UNDERLAY":
                if sim_underlay.has_edge(src, tgt):
                    sim_underlay.remove_edge(src, tgt)
                # Check which overlays use this underlay link
                for ovl in self.raw_topology.get("links", []):
                    if ovl.get("layer") == "OVERLAY" and ovl.get("underlay_path"):
                        path = ovl["underlay_path"]
                        # If edge (src, tgt) is in underlay path
                        for idx in range(len(path) - 1):
                            if (path[idx] == src and path[idx+1] == tgt) or (path[idx] == tgt and path[idx+1] == src):
                                severed_overlay_tunnels.append({
                                    "link_id": ovl["id"],
                                    "name": ovl["name"],
                                    "reason": f"Underlay transport link {failed_entity_id} severed"
                                })
            else: # OVERLAY link failure
                if sim_overlay.has_edge(src, tgt):
                    sim_overlay.remove_edge(src, tgt)
                severed_overlay_tunnels.append({
                    "link_id": link_data["id"],
                    "name": link_data["name"],
                    "reason": "Direct Overlay link failure"
                })

        # Check reachability to Datacenter from all branches
        dc_node = "DC1-CE-01"
        branch_nodes = ["BR-NYC-CE-01", "BR-CHI-CE-01", "BR-SFO-CE-01", "BR-MIA-CE-01"]
        reachability_summary = {}

        for br in branch_nodes:
            if br == failed_entity_id:
                reachability_summary[br] = {"status": "FAILED_ENTITY", "reachable": False}
                continue
            
            underlay_reachable = nx.has_path(sim_underlay, br, dc_node) if sim_underlay.has_node(br) and sim_underlay.has_node(dc_node) else False
            overlay_reachable = nx.has_path(sim_overlay, br, dc_node) if sim_overlay.has_node(br) and sim_overlay.has_node(dc_node) else False
            
            reachability_summary[br] = {
                "underlay_reachable": underlay_reachable,
                "overlay_reachable": overlay_reachable,
                "status": "HEALTHY" if (underlay_reachable and overlay_reachable) else "DEGRADED" if (underlay_reachable or overlay_reachable) else "ISOLATED"
            }
            if not underlay_reachable and not overlay_reachable:
                isolated_sites.append(br)

        # Compute criticality score
        criticality = "HIGH" if (len(severed_overlay_tunnels) > 2 or len(isolated_sites) > 0) else "MEDIUM" if len(severed_overlay_tunnels) > 0 else "LOW"

        return {
            "failed_entity_id": failed_entity_id,
            "entity_type": "NODE" if is_node else "LINK",
            "impact_criticality": criticality,
            "severed_overlay_tunnels_count": len(severed_overlay_tunnels),
            "severed_overlay_tunnels": severed_overlay_tunnels,
            "isolated_branches": isolated_sites,
            "branch_reachability_matrix": reachability_summary,
            "recommended_recovery_action": (
                "Initiate SD-WAN IPSec dynamic re-route over secondary PE uplink" 
                if is_node and "PE" in failed_entity_id 
                else "Engage Service Provider circuit maintenance team"
            )
        }

topology_engine = TopologyEngine()
