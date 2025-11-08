from flask import Flask, jsonify, request
from flask_cors import CORS
import networkx as nx
import numpy as np

app = Flask(__name__)
CORS(app)  # Permet les requêtes depuis React

# Création du graphe Zachary Karate Club
def create_karate_graph():
    G = nx.Graph()
    G.add_nodes_from(range(34))
    
    edges = [
        (0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 6), (0, 7), (0, 8), (0, 10),
        (0, 11), (0, 12), (0, 13), (0, 17), (0, 19), (0, 21), (0, 31),
        (1, 2), (1, 3), (1, 7), (1, 13), (1, 17), (1, 19), (1, 21), (1, 30),
        (2, 3), (2, 7), (2, 8), (2, 9), (2, 13), (2, 27), (2, 28), (2, 32),
        (3, 7), (3, 12), (3, 13), (4, 6), (4, 10),
        (5, 6), (5, 10), (5, 16), (6, 16),
        (8, 30), (8, 32), (8, 33), (9, 33), (13, 33),
        (14, 32), (14, 33), (15, 32), (15, 33),
        (18, 32), (18, 33), (19, 33),
        (20, 32), (20, 33), (22, 32), (22, 33),
        (23, 25), (23, 27), (23, 29), (23, 32), (23, 33),
        (24, 25), (24, 27), (24, 31), (25, 31),
        (26, 29), (26, 33), (27, 33), (28, 31), (28, 33),
        (29, 32), (29, 33), (30, 32), (30, 33),
        (31, 32), (31, 33), (32, 33)
    ]
    G.add_edges_from(edges)
    return G

# Graphe global
G = create_karate_graph()

def calculate_3d_positions(graph):
    """Calcule des positions 3D pour les nœuds"""
    pos_2d = nx.spring_layout(graph, dim=2, seed=42)
    
    # Ajouter une dimension Z basée sur la centralité
    betweenness = nx.betweenness_centrality(graph)
    
    positions_3d = {}
    for node in graph.nodes():
        x, y = pos_2d[node]
        z = betweenness[node] * 2  # Hauteur basée sur la centralité
        positions_3d[node] = {
            'x': float(x * 10),
            'y': float(y * 10),
            'z': float(z * 10)
        }
    
    return positions_3d

@app.route('/api/graph', methods=['GET'])
def get_graph():
    """Retourne le graphe complet en JSON"""
    
    # Positions 3D
    positions = calculate_3d_positions(G)
    
    # Centralités
    degree_cent = nx.degree_centrality(G)
    betweenness_cent = nx.betweenness_centrality(G)
    closeness_cent = nx.closeness_centrality(G)
    eigenvector_cent = nx.eigenvector_centrality(G, max_iter=1000)
    
    # Nœuds avec toutes leurs propriétés
    nodes = []
    for node in G.nodes():
        nodes.append({
            'id': int(node),
            'position': positions[node],
            'degree': G.degree(node),
            'clustering': float(nx.clustering(G, node)),
            'centrality': {
                'degree': float(degree_cent[node]),
                'betweenness': float(betweenness_cent[node]),
                'closeness': float(closeness_cent[node]),
                'eigenvector': float(eigenvector_cent[node])
            }
        })
    
    # Arêtes
    edges = []
    for edge in G.edges():
        edges.append({
            'source': int(edge[0]),
            'target': int(edge[1])
        })
    
    return jsonify({
        'nodes': nodes,
        'edges': edges,
        'stats': {
            'num_nodes': G.number_of_nodes(),
            'num_edges': G.number_of_edges(),
            'density': float(nx.density(G)),
            'avg_clustering': float(nx.average_clustering(G)),
            'triangles': sum(nx.triangles(G).values()) // 3
        }
    })

@app.route('/api/centrality/<measure>', methods=['GET'])
def get_centrality(measure):
    """Retourne les top 5 nœuds pour une mesure de centralité"""
    
    if measure == 'degree':
        cent = nx.degree_centrality(G)
    elif measure == 'betweenness':
        cent = nx.betweenness_centrality(G)
    elif measure == 'closeness':
        cent = nx.closeness_centrality(G)
    elif measure == 'eigenvector':
        cent = nx.eigenvector_centrality(G, max_iter=1000)
    else:
        return jsonify({'error': 'Invalid measure'}), 400
    
    top_5 = sorted(cent.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return jsonify({
        'measure': measure,
        'top_nodes': [{'node': int(node), 'score': float(score)} for node, score in top_5]
    })

@app.route('/api/node/<int:node_id>', methods=['POST'])
def add_node(node_id):
    """Ajoute un nœud"""
    if node_id in G.nodes():
        return jsonify({'error': 'Node already exists'}), 400
    
    G.add_node(node_id)
    return jsonify({'success': True, 'node_id': node_id})

@app.route('/api/node/<int:node_id>', methods=['DELETE'])
def delete_node(node_id):
    """Supprime un nœud"""
    if node_id not in G.nodes():
        return jsonify({'error': 'Node does not exist'}), 404
    
    G.remove_node(node_id)
    return jsonify({'success': True, 'node_id': node_id})

@app.route('/api/edge', methods=['POST'])
def add_edge():
    """Ajoute une arête"""
    data = request.json
    source = data.get('source')
    target = data.get('target')
    
    if source not in G.nodes() or target not in G.nodes():
        return jsonify({'error': 'One or both nodes do not exist'}), 400
    
    if G.has_edge(source, target):
        return jsonify({'error': 'Edge already exists'}), 400
    
    G.add_edge(source, target)
    return jsonify({'success': True, 'edge': [source, target]})

@app.route('/api/edge', methods=['DELETE'])
def delete_edge():
    """Supprime une arête"""
    data = request.json
    source = data.get('source')
    target = data.get('target')
    
    if not G.has_edge(source, target):
        return jsonify({'error': 'Edge does not exist'}), 404
    
    G.remove_edge(source, target)
    return jsonify({'success': True, 'edge': [source, target]})

@app.route('/api/reset', methods=['POST'])
def reset_graph():
    """Réinitialise le graphe"""
    global G
    G = create_karate_graph()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)