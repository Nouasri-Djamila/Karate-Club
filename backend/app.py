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
    import random
    
    # Si le graphe est vide ou a un seul nœud
    if graph.number_of_nodes() == 0:
        return {}
    
    if graph.number_of_nodes() == 1:
        node = list(graph.nodes())[0]
        return {node: {'x': 0.0, 'y': 0.0, 'z': 0.0}}
    
    try:
        pos_2d = nx.spring_layout(graph, dim=2, seed=42)
    except:
        # En cas d'erreur, positions aléatoires
        pos_2d = {node: (random.uniform(-1, 1), random.uniform(-1, 1)) 
                  for node in graph.nodes()}
    
    # Ajouter une dimension Z basée sur la centralité
    try:
        betweenness = nx.betweenness_centrality(graph)
    except:
        betweenness = {node: 0 for node in graph.nodes()}
    
    positions_3d = {}
    for node in graph.nodes():
        # Récupérer les positions avec valeurs par défaut
        x, y = pos_2d.get(node, (random.uniform(-1, 1), random.uniform(-1, 1)))
        z = betweenness.get(node, 0) * 2
        
        # Vérifier et corriger les NaN
        x = 0.0 if (np.isnan(x) or np.isinf(x)) else float(x)
        y = 0.0 if (np.isnan(y) or np.isinf(y)) else float(y)
        z = 0.0 if (np.isnan(z) or np.isinf(z)) else float(z)
        
        positions_3d[node] = {
            'x': x * 10,
            'y': y * 10,
            'z': z * 10
        }
    
    return positions_3d
def calculate_all_metrics(graph):
    """
    Calcule TOUTES les métriques demandées dans le projet :
    - Ordre, Taille, Distribution des degrés
    - Coefficients de clustering
    - Motifs fréquents (triangles, chaînes, étoiles)
    - Cliques et k-cores
    - Centralités
    """
    
    # ==========================================
    # 1. MESURES DE BASE
    # ==========================================
    ordre = graph.number_of_nodes()
    taille = graph.number_of_edges()
    densite = float(nx.density(graph))
    
    # ==========================================
    # 2. DISTRIBUTION DES DEGRÉS
    # ==========================================
    degres = dict(graph.degree())
    degres_list = list(degres.values())
    degree_distribution = {
        'min': min(degres_list) if degres_list else 0,
        'max': max(degres_list) if degres_list else 0,
        'mean': float(np.mean(degres_list)) if degres_list else 0,
        'median': float(np.median(degres_list)) if degres_list else 0,
        'std': float(np.std(degres_list)) if degres_list else 0
    }
    
    # ==========================================
    # 3. COEFFICIENTS DE CLUSTERING
    # ==========================================
    clustering_coefficients = nx.clustering(graph)
    avg_clustering = float(nx.average_clustering(graph))
    transitivite = float(nx.transitivity(graph))
    
    # ==========================================
    # 4. MOTIFS FRÉQUENTS
    # ==========================================
    
    # 4.1 Triangles (3-cliques)
    triangles_dict = nx.triangles(graph)
    total_triangles = sum(triangles_dict.values()) // 3
    
    # 4.2 Chaînes de 3 nœuds (A—B—C sans lien A-C)
    paths_3 = 0
    for node in graph.nodes():
        neighbors = list(graph.neighbors(node))
        for i in range(len(neighbors)):
            for j in range(i + 1, len(neighbors)):
                if not graph.has_edge(neighbors[i], neighbors[j]):
                    paths_3 += 1
    paths_3 //= 2
    
    # 4.3 Étoiles locales (nœuds avec >=3 voisins mais pas de triangles)
    etoiles = []
    for node in graph.nodes():
        if len(list(graph.neighbors(node))) >= 3:
            if triangles_dict[node] == 0:
                etoiles.append(int(node))
    
    # ==========================================
    # 5. CLIQUES
    # ==========================================
    cliques = list(nx.find_cliques(graph))
    nb_cliques = len(cliques)
    max_clique = max(cliques, key=len) if cliques else []
    max_clique_size = len(max_clique)
    
    # Distribution des tailles de cliques
    clique_sizes = [len(c) for c in cliques]
    clique_distribution = {}
    for size in set(clique_sizes):
        clique_distribution[size] = clique_sizes.count(size)
    
    # ==========================================
    # 6. K-CORES
    # ==========================================
    core_numbers = nx.core_number(graph)
    max_k_core = max(core_numbers.values()) if core_numbers else 0
    
    # Distribution des k-cores
    k_core_distribution = {}
    for k in range(max_k_core + 1):
        nodes_in_k_core = [n for n, core in core_numbers.items() if core == k]
        k_core_distribution[k] = len(nodes_in_k_core)
    
    # ==========================================
    # 7. CENTRALITÉS
    # ==========================================
    degree_cent = nx.degree_centrality(graph)
    betweenness_cent = nx.betweenness_centrality(graph)
    closeness_cent = nx.closeness_centrality(graph)
    eigenvector_cent = nx.eigenvector_centrality(graph, max_iter=1000)
    
    # Top 5 pour chaque centralité
    top_centralities = {
        'degree': sorted(degree_cent.items(), key=lambda x: x[1], reverse=True)[:5],
        'betweenness': sorted(betweenness_cent.items(), key=lambda x: x[1], reverse=True)[:5],
        'closeness': sorted(closeness_cent.items(), key=lambda x: x[1], reverse=True)[:5],
        'eigenvector': sorted(eigenvector_cent.items(), key=lambda x: x[1], reverse=True)[:5]
    }
    
    # ==========================================
    # 8. PROPRIÉTÉS AVANCÉES
    # ==========================================
    
    # Diamètre et rayon (si le graphe est connexe)
    if nx.is_connected(graph):
        diameter = nx.diameter(graph)
        radius = nx.radius(graph)
        avg_shortest_path = float(nx.average_shortest_path_length(graph))
    else:
        diameter = None
        radius = None
        avg_shortest_path = None
    
    # Nombre de composantes connexes
    num_components = nx.number_connected_components(graph)
    
    # Assortativity (tendance des nœuds à se connecter avec des nœuds similaires)
    try:
        assortativity = float(nx.degree_assortativity_coefficient(graph))
    except:
        assortativity = None
    
    return {
        # Mesures de base
        'ordre': ordre,
        'taille': taille,
        'densite': densite,
        'type_graphe': 'Non orienté, non pondéré',
        
        # Distribution des degrés
        'degree_distribution': degree_distribution,
        
        # Clustering
        'avg_clustering': avg_clustering,
        'transitivite': transitivite,
        
        # Motifs fréquents
        'triangles': total_triangles,
        'paths_3': paths_3,
        'etoiles': etoiles,
        'nb_etoiles': len(etoiles),
        
        # Cliques
        'nb_cliques': nb_cliques,
        'max_clique': [int(n) for n in max_clique],
        'max_clique_size': max_clique_size,
        'clique_distribution': clique_distribution,
        
        # K-cores
        'max_k_core': max_k_core,
        'k_core_distribution': k_core_distribution,
        
        # Centralités (top 5)
        'top_centralities': {
            measure: [{'node': int(n), 'score': float(s)} for n, s in top]
            for measure, top in top_centralities.items()
        },
        
        # Propriétés avancées
        'diameter': diameter,
        'radius': radius,
        'avg_shortest_path': avg_shortest_path,
        'num_components': num_components,
        'assortativity': assortativity
    }

@app.route('/api/graph', methods=['GET'])
def get_graph():
    """Retourne le graphe complet avec TOUS les calculs"""
    
    # Positions 3D
    positions = calculate_3d_positions(G)
    
    # Centralités pour chaque nœud
    degree_cent = nx.degree_centrality(G)
    betweenness_cent = nx.betweenness_centrality(G)
    closeness_cent = nx.closeness_centrality(G)
    eigenvector_cent = nx.eigenvector_centrality(G, max_iter=1000)
    core_numbers = nx.core_number(G)
    
    # Nœuds avec toutes leurs propriétés
    nodes = []
    for node in G.nodes():
        nodes.append({
            'id': int(node),
            'position': positions[node],
            'degree': G.degree(node),
            'clustering': float(nx.clustering(G, node)),
            'triangles': int(nx.triangles(G, node)),
            'k_core': int(core_numbers[node]),
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
    
    # Calculer TOUTES les métriques
    all_metrics = calculate_all_metrics(G)
    
    return jsonify({
        'nodes': nodes,
        'edges': edges,
        'metrics': all_metrics
    })

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Endpoint dédié pour obtenir uniquement les métriques"""
    metrics = calculate_all_metrics(G)
    return jsonify(metrics)

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

@app.route('/api/adjacency-matrix', methods=['GET'])
def get_adjacency_matrix():
    """Retourne la matrice d'adjacence"""
    adj_matrix = nx.adjacency_matrix(G).todense().tolist()
    nodes = sorted(list(G.nodes()))
    
    return jsonify({
        'matrix': adj_matrix,
        'nodes': nodes
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)