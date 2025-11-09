import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const App = () => {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [centralityType, setCentralityType] = useState('betweenness');
  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [showDeleteEdge, setShowDeleteEdge] = useState(false);
  const [newNodeId, setNewNodeId] = useState('');
  const [newEdgeSource, setNewEdgeSource] = useState('');
  const [newEdgeTarget, setNewEdgeTarget] = useState('');
  const [deleteEdgeSource, setDeleteEdgeSource] = useState('');
  const [deleteEdgeTarget, setDeleteEdgeTarget] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [adjacencyMatrix, setAdjacencyMatrix] = useState(null);
  
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef({
    nodes: [],
    edges: [],
    labels: [],
    isDragging: false,
    previousMouse: { x: 0, y: 0 },
    rotation: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 }
  });

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/graph');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGraphData(data);
      setMetrics(data.metrics);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching graph:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchMatrix = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/adjacency-matrix');
      const data = await response.json();
      setAdjacencyMatrix(data);
      setShowMatrix(true);
    } catch (err) {
      alert('Erreur lors du chargement de la matrice: ' + err.message);
    }
  };

  const addNode = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/node/${newNodeId}`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchGraphData();
        setNewNodeId('');
        setShowAddNode(false);
      } else {
        alert('Erreur lors de l\'ajout du nœud');
      }
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  const addEdge = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/edge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: parseInt(newEdgeSource), target: parseInt(newEdgeTarget) })
      });
      if (response.ok) {
        await fetchGraphData();
        setNewEdgeSource('');
        setNewEdgeTarget('');
        setShowAddEdge(false);
      } else {
        alert('Erreur lors de l\'ajout de l\'arête');
      }
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  const deleteEdge = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/edge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: parseInt(deleteEdgeSource), target: parseInt(deleteEdgeTarget) })
      });
      if (response.ok) {
        await fetchGraphData();
        setDeleteEdgeSource('');
        setDeleteEdgeTarget('');
        setShowDeleteEdge(false);
      } else {
        alert('Erreur lors de la suppression de l\'arête');
      }
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  const deleteNode = async (nodeId) => {
    if (!window.confirm(`Supprimer le nœud ${nodeId} ?`)) return;
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/node/${nodeId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchGraphData();
        setSelectedNode(null);
      }
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  const exportCSV = () => {
    if (!graphData || !metrics) return;
    let csv = 'Node,Degree,Clustering,Triangles,K_Core,Degree_Centrality,Betweenness,Closeness,Eigenvector\n';
    graphData.nodes.forEach(node => {
      csv += `${node.id},${node.degree},${node.clustering},${node.triangles},${node.k_core},${node.centrality.degree},${node.centrality.betweenness},${node.centrality.closeness},${node.centrality.eigenvector}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'karate_club_analysis.csv';
    a.click();
  };

  const exportPNG = () => {
    if (!rendererRef.current) return;
    const canvas = rendererRef.current.domElement;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'karate_club_graph.png';
      a.click();
    });
  };

  useEffect(() => {
    if (!graphData || !mountRef.current) return;

    const controls = controlsRef.current;
    controls.nodes = [];
    controls.edges = [];
    controls.labels = [];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      (window.innerWidth * 0.7) / (window.innerHeight * 0.9),
      0.1,
      1000
    );
    camera.position.set(10, 10, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.9);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, -5, -10);
    scene.add(directionalLight2);

    const gridHelper = new THREE.GridHelper(50, 50, 0xcccccc, 0xeeeeee);
    scene.add(gridHelper);

    const centralityValues = graphData.nodes.map(n => n.centrality[centralityType]);
    const minCentrality = Math.min(...centralityValues);
    const maxCentrality = Math.max(...centralityValues);

    graphData.nodes.forEach(node => {
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      
      let normalizedValue = 
        (node.centrality[centralityType] - minCentrality) / (maxCentrality - minCentrality);
      
      let baseColor;
      if (normalizedValue < 0.33) {
        baseColor = new THREE.Color(0xff6b6b);
      } else if (normalizedValue < 0.66) {
        baseColor = new THREE.Color(0xffd93d);
      } else {
        baseColor = new THREE.Color(0x6bcf7f);
      }
      
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor.clone().multiplyScalar(0.3),
        metalness: 0.3,
        roughness: 0.4
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(node.position.x, node.position.z, node.position.y);
      sphere.userData = node;
      scene.add(sphere);
      controls.nodes.push(sphere);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 128;
      
      context.clearRect(0, 0, 128, 128);
      context.fillStyle = '#ffffff';
      context.strokeStyle = '#000000';
      context.lineWidth = 4;
      context.font = 'bold 64px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.strokeText(node.id.toString(), 64, 64);
      context.fillText(node.id.toString(), 64, 64);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(node.position.x, node.position.z, node.position.y);
      sprite.scale.set(1.2, 1.2, 1);
      scene.add(sprite);
      controls.labels.push(sprite);
    });

    graphData.edges.forEach(edge => {
      const sourceNode = graphData.nodes.find(n => n.id === edge.source);
      const targetNode = graphData.nodes.find(n => n.id === edge.target);

      const points = [
        new THREE.Vector3(sourceNode.position.x, sourceNode.position.z, sourceNode.position.y),
        new THREE.Vector3(targetNode.position.x, targetNode.position.z, targetNode.position.y)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ 
        color: 0xcccccc, 
        transparent: true, 
        opacity: 0.4 
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      controls.edges.push(line);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (event) => {
      controls.isDragging = true;
      controls.previousMouse = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = () => {
      controls.isDragging = false;
    };

    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (controls.isDragging) {
        const deltaX = event.clientX - controls.previousMouse.x;
        const deltaY = event.clientY - controls.previousMouse.y;

        controls.targetRotation.y += deltaX * 0.005;
        controls.targetRotation.x += deltaY * 0.005;

        controls.previousMouse = { x: event.clientX, y: event.clientY };
        renderer.domElement.style.cursor = 'grabbing';
      } else {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(controls.nodes);
        renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
      }
    };

    const onClick = (event) => {
      if (Math.abs(event.clientX - controls.previousMouse.x) > 5 ||
          Math.abs(event.clientY - controls.previousMouse.y) > 5) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(controls.nodes);

      if (intersects.length > 0) {
        setSelectedNode(intersects[0].object.userData);
      }
    };

    const onWheel = (event) => {
      event.preventDefault();
      const zoomSpeed = 0.1;
      const delta = event.deltaY * -0.001;
      const newZ = camera.position.length() * (1 - delta * zoomSpeed);
      
      if (newZ > 5 && newZ < 50) {
        const factor = newZ / camera.position.length();
        camera.position.multiplyScalar(factor);
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.style.cursor = 'grab';

    const animate = () => {
      requestAnimationFrame(animate);
      
      const dampingFactor = 0.05;
      controls.rotation.x += (controls.targetRotation.x - controls.rotation.x) * dampingFactor;
      controls.rotation.y += (controls.targetRotation.y - controls.rotation.y) * dampingFactor;

      const radius = Math.sqrt(
        camera.position.x * camera.position.x +
        camera.position.y * camera.position.y +
        camera.position.z * camera.position.z
      );

      camera.position.x = radius * Math.sin(controls.rotation.y) * Math.cos(controls.rotation.x);
      camera.position.y = radius * Math.sin(controls.rotation.x);
      camera.position.z = radius * Math.cos(controls.rotation.y) * Math.cos(controls.rotation.x);
      camera.lookAt(0, 0, 0);

      controls.nodes.forEach((node, i) => {
        const scale = 1 + Math.sin(Date.now() * 0.001 + i) * 0.05;
        node.scale.set(scale, scale, scale);
      });

      controls.labels.forEach(label => {
        label.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = (window.innerWidth * 0.7) / (window.innerHeight * 0.9);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.9);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [graphData, centralityType]);

  const getCentralityLabel = () => {
    const labels = {
      degree: 'Centralité de Degré',
      betweenness: 'Centralité d\'Intermédiarité',
      closeness: 'Centralité de Proximité',
      eigenvector: 'Centralité de Vecteur Propre'
    };
    return labels[centralityType];
  };

  const getCentralityInterpretation = () => {
    const interpretations = {
      degree: 'Les nœuds verts ont le plus de connexions directes. Ils sont les plus populaires et influents localement.',
      betweenness: 'Les nœuds verts sont des ponts essentiels. Ils contrôlent le flux d\'information entre différentes parties du réseau.',
      closeness: 'Les nœuds verts peuvent atteindre tous les autres nœuds rapidement. Ils sont centraux dans la structure globale.',
      eigenvector: 'Les nœuds verts sont connectés à d\'autres nœuds importants. Leur influence provient de la qualité de leurs connexions.'
    };
    return interpretations[centralityType];
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>INITIALIZING NETWORK ANALYSIS...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loading}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.errorText}>CONNECTION ERROR</p>
        <p style={styles.errorDetail}>{error}</p>
        <p style={styles.errorHelp}>Assurez-vous que le serveur Flask est démarré sur le port 5000</p>
        <button onClick={fetchGraphData} style={styles.retryButton}>RETRY</button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>ZACHARY KARATE CLUB</h1>
        <p style={styles.headerSubtitle}>3D NETWORK TOPOLOGY VISUALIZATION - Drag to rotate • Scroll to zoom</p>
      </div>

      <div style={styles.container}>
        <div style={styles.canvasContainer}>
          <div style={styles.legend}>
            <div style={styles.legendTitle}>{getCentralityLabel()}</div>
            <div style={styles.legendRow}>
              <div style={{...styles.colorSquare, background: '#ff6b6b'}}></div>
              <span style={styles.legendLabel}>Faible</span>
            </div>
            <div style={styles.legendRow}>
              <div style={{...styles.colorSquare, background: '#ffd93d'}}></div>
              <span style={styles.legendLabel}>Moyen</span>
            </div>
            <div style={styles.legendRow}>
              <div style={{...styles.colorSquare, background: '#6bcf7f'}}></div>
              <span style={styles.legendLabel}>Élevé</span>
            </div>
          </div>
          
          <div ref={mountRef}></div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>TYPE DE CENTRALITÉ</h2>
            <select 
              value={centralityType} 
              onChange={(e) => setCentralityType(e.target.value)}
              style={styles.select}
            >
              <option value="degree">Degré</option>
              <option value="betweenness">Intermédiarité</option>
              <option value="closeness">Proximité</option>
              <option value="eigenvector">Vecteur Propre</option>
            </select>
            <div style={styles.interpretation}>
              <strong>Interprétation:</strong> {getCentralityInterpretation()}
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>STATISTIQUES DE BASE</h2>
            <div style={styles.metric}>
              <span style={styles.label}>ORDRE (NŒUDS)</span>
              <span style={styles.value}>{metrics?.ordre}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>TAILLE (ARÊTES)</span>
              <span style={styles.value}>{metrics?.taille}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>DENSITÉ</span>
              <span style={styles.value}>{metrics?.densite.toFixed(3)}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>TYPE</span>
              <span style={styles.value}>Non orienté</span>
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>DISTRIBUTION DES DEGRÉS</h2>
            <div style={styles.metric}>
              <span style={styles.label}>MIN</span>
              <span style={styles.value}>{metrics?.degree_distribution.min}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>MAX</span>
              <span style={styles.value}>{metrics?.degree_distribution.max}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>MOYENNE</span>
              <span style={styles.value}>{metrics?.degree_distribution.mean.toFixed(2)}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>MÉDIANE</span>
              <span style={styles.value}>{metrics?.degree_distribution.median.toFixed(2)}</span>
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>CLUSTERING</h2>
            <div style={styles.metric}>
              <span style={styles.label}>COEFFICIENT MOYEN</span>
              <span style={styles.value}>{metrics?.avg_clustering.toFixed(3)}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>TRANSITIVITÉ</span>
              <span style={styles.value}>{metrics?.transitivite.toFixed(3)}</span>
            </div>
            <div style={styles.motifDescription}>
              Le coefficient élevé indique des groupes cohésifs avec forte tendance à former des triangles.
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>MOTIFS FRÉQUENTS</h2>
            <div style={styles.metric}>
              <span style={styles.label}>TRIANGLES</span>
              <span style={styles.value}>{metrics?.triangles}</span>
            </div>
            <div style={styles.motifDescription}>
              Groupes de 3 personnes mutuellement connectées. Signe de relations sociales étroites.
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>CHAÎNES (A-B-C)</span>
              <span style={styles.value}>{metrics?.paths_3}</span>
            </div>
            <div style={styles.motifDescription}>
              Chemins de 3 nœuds où A et C ne sont pas directement connectés.
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>ÉTOILES LOCALES</span>
              <span style={styles.value}>{metrics?.nb_etoiles}</span>
            </div>
            <div style={styles.motifDescription}>
              Nœuds centraux avec ≥3 voisins mais sans triangles (hub sans clustering).
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>CLIQUES</h2>
            <div style={styles.metric}>
              <span style={styles.label}>NOMBRE TOTAL</span>
              <span style={styles.value}>{metrics?.nb_cliques}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.label}>TAILLE MAXIMALE</span>
              <span style={styles.value}>{metrics?.max_clique_size}</span>
            </div>
            <div style={styles.motifDescription}>
              Plus grande clique: nœuds {metrics?.max_clique?.join(', ')}
            </div>
            <h3 style={styles.panelSubtitle}>DISTRIBUTION</h3>
            {metrics?.clique_distribution && Object.entries(metrics.clique_distribution).map(([size, count]) => (
              <div key={size} style={styles.metric}>
                <span style={styles.label}>CLIQUES DE TAILLE {size}</span>
                <span style={styles.value}>{count}</span>
              </div>
            ))}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>K-CORES</h2>
            <div style={styles.metric}>
              <span style={styles.label}>K-CORE MAXIMUM</span>
              <span style={styles.value}>{metrics?.max_k_core}</span>
            </div>
            <div style={styles.motifDescription}>
              Le noyau central (k={metrics?.max_k_core}) contient les membres les plus interconnectés.
            </div>
            <h3 style={styles.panelSubtitle}>DISTRIBUTION</h3>
            {metrics?.k_core_distribution && Object.entries(metrics.k_core_distribution).map(([k, count]) => (
              <div key={k} style={styles.metric}>
                <span style={styles.label}>{k}-CORE</span>
                <span style={styles.value}>{count} nœuds</span>
              </div>
            ))}
          </div>

          {selectedNode && (
            <div style={styles.panel}>
              <h2 style={styles.panelTitle}>NŒUD #{selectedNode.id}</h2>
              <div style={styles.metric}>
                <span style={styles.label}>DEGRÉ</span>
                <span style={styles.value}>{selectedNode.degree}</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.label}>CLUSTERING</span>
                <span style={styles.value}>{selectedNode.clustering.toFixed(3)}</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.label}>TRIANGLES</span>
                <span style={styles.value}>{selectedNode.triangles}</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.label}>K-CORE</span>
                <span style={styles.value}>{selectedNode.k_core}</span>
              </div>
              <h3 style={styles.panelSubtitle}>CENTRALITÉS</h3>
              <div style={styles.metric}>
                <span style={styles.label}>DEGRÉ</span>
                <span style={styles.value}>{selectedNode.centrality.degree.toFixed(3)}</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.label}>INTERMÉDIARITÉ</span>
                <span style={styles.value}>{selectedNode.centrality.betweenness.toFixed(3)}</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.label}>PROXIMITÉ</span>
                <span style={styles.value}>{selectedNode.centrality.closeness.toFixed(3)}</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.label}>VECTEUR PROPRE</span>
                <span style={styles.value}>{selectedNode.centrality.eigenvector.toFixed(3)}</span>
              </div>
              <button onClick={() => deleteNode(selectedNode.id)} style={{...styles.button, background: '#ffebee', color: '#c62828', marginTop: '15px'}}>
                SUPPRIMER CE NŒUD
              </button>
            </div>
          )}

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>ACTIONS</h2>
            
            <button onClick={() => setShowAddNode(!showAddNode)} style={styles.button}>
              {showAddNode ? '✕ ANNULER' : '+ AJOUTER NŒUD'}
            </button>
            {showAddNode && (
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="ID du nœud"
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value)}
                  style={styles.input}
                />
                <button onClick={addNode} style={styles.buttonSmall}>AJOUTER</button>
              </div>
            )}

            <button onClick={() => setShowAddEdge(!showAddEdge)} style={styles.button}>
              {showAddEdge ? '✕ ANNULER' : '+ AJOUTER ARÊTE'}
            </button>
            {showAddEdge && (
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="Source"
                  value={newEdgeSource}
                  onChange={(e) => setNewEdgeSource(e.target.value)}
                  style={styles.input}
                />
                <input
                  type="number"
                  placeholder="Cible"
                  value={newEdgeTarget}
                  onChange={(e) => setNewEdgeTarget(e.target.value)}
                  style={styles.input}
                />
                <button onClick={addEdge} style={styles.buttonSmall}>AJOUTER</button>
              </div>
            )}

            <button onClick={() => setShowDeleteEdge(!showDeleteEdge)} style={styles.button}>
              {showDeleteEdge ? '✕ ANNULER' : '− SUPPRIMER ARÊTE'}
            </button>
            {showDeleteEdge && (
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="Source"
                  value={deleteEdgeSource}
                  onChange={(e) => setDeleteEdgeSource(e.target.value)}
                  style={styles.input}
                />
                <input
                  type="number"
                  placeholder="Cible"
                  value={deleteEdgeTarget}
                  onChange={(e) => setDeleteEdgeTarget(e.target.value)}
                  style={styles.input}
                />
                <button onClick={deleteEdge} style={{...styles.buttonSmall, background: '#ffebee', color: '#c62828'}}>SUPPRIMER</button>
              </div>
            )}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>MATRICE D'ADJACENCE</h2>
            <button onClick={fetchMatrix} style={styles.button}>
              {showMatrix ? 'MASQUER MATRICE' : 'AFFICHER MATRICE'}
            </button>
            {showMatrix && adjacencyMatrix && (
              <div style={styles.matrixContainer}>
                <div style={styles.matrixScroll}>
                  <table style={styles.matrixTable}>
                    <thead>
                      <tr>
                        <th style={styles.matrixHeader}></th>
                        {adjacencyMatrix.nodes.map(node => (
                          <th key={node} style={styles.matrixHeader}>{node}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adjacencyMatrix.matrix.map((row, i) => (
                        <tr key={i}>
                          <th style={styles.matrixHeader}>{adjacencyMatrix.nodes[i]}</th>
                          {row.map((cell, j) => (
                            <td key={j} style={{
                              ...styles.matrixCell,
                              background: cell === 1 ? '#e3f2fd' : '#fff'
                            }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>EXPORT</h2>
            <button onClick={exportCSV} style={styles.button}>💾 EXPORTER CSV</button>
            <button onClick={exportPNG} style={styles.button}>🖼️ EXPORTER PNG</button>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>ANALYSE DÉTAILLÉE</h2>
            <button onClick={() => setShowAnalysis(!showAnalysis)} style={styles.button}>
              {showAnalysis ? 'MASQUER' : 'AFFICHER ANALYSE'}
            </button>
            {showAnalysis && metrics && (
              <div style={styles.analysisText}>
                <p><strong> Réseau de Zachary:</strong> Ce graphe représente les interactions sociales dans un club de karaté universitaire, étudié par Wayne Zachary en 1977.</p>
                
                <p><strong> Structure Générale:</strong> Le réseau contient {metrics.ordre} membres connectés par {metrics.taille} interactions. La densité de {metrics.densite.toFixed(3)} indique un réseau moyennement connecté où environ {(metrics.densite * 100).toFixed(1)}% des connexions possibles existent.</p>
                
                <p><strong> Distribution des Degrés:</strong> Les degrés varient de {metrics.degree_distribution.min} à {metrics.degree_distribution.max} avec une moyenne de {metrics.degree_distribution.mean.toFixed(2)}. Cette variance indique une hiérarchie claire entre membres périphériques et centraux.</p>
                
                <p><strong> Cohésion Sociale:</strong> Le coefficient de clustering moyen de {metrics.avg_clustering.toFixed(3)} révèle une forte tendance à former des groupes ("l'ami de mon ami est mon ami"). La transitivité de {metrics.transitivite.toFixed(3)} confirme cette cohésion.</p>
                
                <p><strong> Motifs Triangulaires:</strong> Les {metrics.triangles} triangles détectés représentent des triades fermées, signe de relations sociales fortes et de confiance mutuelle. Les {metrics.paths_3} chaînes ouvertes montrent aussi des connexions indirectes potentielles.</p>
                
                <p><strong> Étoiles et Hubs:</strong> {metrics.nb_etoiles} nœuds agissent comme des "étoiles locales" - des connecteurs sans former de triangles, jouant un rôle de pont entre groupes.</p>
                
                <p><strong> Cliques:</strong> Le réseau contient {metrics.nb_cliques} cliques au total. La plus grande clique (taille {metrics.max_clique_size}) regroupe les nœuds {metrics.max_clique.join(', ')} - un sous-groupe complètement interconnecté.</p>
                
                <p><strong>K-Cores:</strong> Le k-core maximum est {metrics.max_k_core}, révélant une structure en couches. Le noyau central ({metrics.max_k_core}-core) contient les membres les plus engagés et interconnectés.</p>
                
                <p><strong> Nœuds Clés:</strong> Les analyses de centralité révèlent que les nœuds {metrics.top_centralities.betweenness.slice(0, 3).map(n => n.node).join(', ')} sont les plus cruciaux. Le nœud 0 (instructeur) et le nœud 33 (administrateur) dominent plusieurs métriques.</p>
                
                {metrics.diameter && (
                  <p><strong> Distances:</strong> Le diamètre du réseau est {metrics.diameter} (distance maximale entre deux nœuds) et le rayon est {metrics.radius}. Le chemin moyen de {metrics.avg_shortest_path.toFixed(2)} indique que les membres sont en moyenne à environ {Math.round(metrics.avg_shortest_path)} pas les uns des autres.</p>
                )}
                
                {metrics.assortativity !== null && (
                  <p><strong>Assortativité:</strong> Le coefficient d'assortativité de {metrics.assortativity.toFixed(3)} indique {metrics.assortativity > 0 ? 'une tendance des nœuds similaires (en degré) à se connecter ensemble' : 'une tendance des nœuds de degrés différents à se connecter (structure hub-and-spoke)'}.</p>
                )}
                
                <p><strong>Contexte Historique:</strong> Ce réseau a capturé la division réelle du club en deux groupes suite à un conflit entre l'instructeur (nœud 0) et l'administrateur (nœud 33). La structure prédisait cette scission avec une précision remarquable, validant les méthodes d'analyse de réseaux sociaux.</p>
              </div>
            )}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>CONTRÔLES</h2>
            <button onClick={fetchGraphData} style={styles.button}>🔄 ACTUALISER</button>
            <button onClick={() => window.location.reload()} style={styles.button}>↺ RÉINITIALISER</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  app: {
    width: '100vw',
    height: '100vh',
    background: '#fff',
    color: '#000',
    fontFamily: "'Courier New', monospace",
    overflow: 'hidden',
    margin: 0,
    padding: 0,
  },
  header: {
    padding: '20px',
    background: 'linear-gradient(90deg, #fff 0%, #f5f5f5 100%)',
    borderBottom: '1px solid #ccc'
  },
  headerTitle: {
    fontSize: '28px',
    letterSpacing: '8px',
    fontWeight: 100,
    marginBottom: '5px',
    margin: 0,
    color: '#000'
  },
  headerSubtitle: {
    fontSize: '11px',
    letterSpacing: '3px',
    color: '#666',
    margin: 0
  },
  container: {
    display: 'flex',
    height: 'calc(100vh - 90px)'
  },
  canvasContainer: {
    flex: 1,
    position: 'relative'
  },
  legend: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #ccc',
    padding: '15px',
    borderRadius: '4px',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  legendTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '10px',
    letterSpacing: '1px',
    color: '#000'
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '8px'
  },
  colorSquare: {
    width: '20px',
    height: '20px',
    border: '1px solid #999',
    flexShrink: 0
  },
  legendLabel: {
    fontSize: '10px',
    color: '#333'
  },
  sidebar: {
    width: '350px',
    background: '#fff',
    borderLeft: '1px solid #ccc',
    overflowY: 'auto',
    padding: '20px'
  },
  panel: {
    background: '#f9f9f9',
    border: '1px solid #ddd',
    padding: '20px',
    marginBottom: '20px'
  },
  panelTitle: {
    fontSize: '14px',
    letterSpacing: '3px',
    marginBottom: '15px',
    color: '#000',
    borderBottom: '1px solid #ccc',
    paddingBottom: '10px',
    fontWeight: 100,
    margin: '0 0 15px 0'
  },
  panelSubtitle: {
    fontSize: '12px',
    letterSpacing: '2px',
    margin: '15px 0 10px 0',
    color: '#666',
    fontWeight: 100
  },
  metric: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    fontSize: '12px'
  },
  label: {
    color: '#666',
    letterSpacing: '2px',
    fontSize: '10px'
  },
  value: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  select: {
    width: '100%',
    padding: '10px',
    background: '#fff',
    border: '1px solid #ccc',
    fontFamily: "'Courier New', monospace",
    fontSize: '12px',
    cursor: 'pointer'
  },
  button: {
    width: '100%',
    padding: '12px',
    marginTop: '10px',
    background: '#f5f5f5',
    color: '#000',
    border: '1px solid #ccc',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '2px',
    transition: 'all 0.3s'
  },
  buttonSmall: {
    padding: '8px 12px',
    background: '#f5f5f5',
    color: '#000',
    border: '1px solid #ccc',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '1px',
    marginTop: '5px'
  },
  inputGroup: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  input: {
    padding: '8px',
    border: '1px solid #ccc',
    fontFamily: "'Courier New', monospace",
    fontSize: '11px'
  },
  analysisText: {
    marginTop: '15px',
    fontSize: '11px',
    lineHeight: '1.8',
    color: '#333'
  },
  interpretation: {
    marginTop: '12px',
    padding: '10px',
    background: '#fff',
    border: '1px solid #ddd',
    fontSize: '10px',
    lineHeight: '1.6',
    color: '#555',
    borderRadius: '2px'
  },
  motifDescription: {
    fontSize: '10px',
    color: '#666',
    lineHeight: '1.5',
    marginTop: '5px',
    marginBottom: '12px',
    fontStyle: 'italic'
  },
  matrixContainer: {
    marginTop: '15px',
    maxHeight: '400px',
    overflow: 'auto',
    border: '1px solid #ddd'
  },
  matrixScroll: {
    overflowX: 'auto'
  },
  matrixTable: {
    borderCollapse: 'collapse',
    fontSize: '9px',
    width: '100%'
  },
  matrixHeader: {
    background: '#f5f5f5',
    padding: '4px',
    border: '1px solid #ddd',
    fontWeight: 'bold',
    minWidth: '25px',
    textAlign: 'center'
  },
  matrixCell: {
    padding: '4px',
    border: '1px solid #ddd',
    textAlign: 'center',
    minWidth: '25px'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#fff',
    color: '#000',
    fontFamily: "'Courier New', monospace"
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '2px solid #ccc',
    borderTop: '2px solid #000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    letterSpacing: '3px',
    fontSize: '12px',
    color: '#666'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  errorText: {
    letterSpacing: '3px',
    fontSize: '14px',
    color: '#f00',
    marginBottom: '10px'
  },
  errorDetail: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '10px'
  },
  errorHelp: {
    fontSize: '11px',
    color: '#999',
    marginBottom: '20px',
    textAlign: 'center',
    maxWidth: '400px'
  },
  retryButton: {
    padding: '12px 24px',
    background: '#f5f5f5',
    color: '#000',
    border: '1px solid #ccc',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '2px'
  }
};

export default App;