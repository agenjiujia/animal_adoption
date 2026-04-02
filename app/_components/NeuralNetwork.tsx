import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** 只抖动 S/L，不碰色相，避免随机 HSL 把节点/连线漂成青绿 */
function jitterBrandColor(base: THREE.Color) {
  const c = base.clone();
  c.offsetHSL(
    0,
    THREE.MathUtils.randFloatSpread(0.07),
    THREE.MathUtils.randFloatSpread(0.07),
  );
  return c;
}

/** 加法混合下偶尔 G 通道偏高会显“ mint ”，压一手绿主导 */
function disposeMeshMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((m) => m.dispose());
  } else {
    material.dispose();
  }
}

function clampNoGreenDominant(c: THREE.Color) {
  const r = c.r;
  const g = c.g;
  const b = c.b;
  const m = Math.max(r, b);
  if (g > m * 0.96) {
    c.setRGB(r, m * 0.9, b);
  }
  return c;
}

type NeuralGraphConnection = {
  node: NeuralGraphNode;
  strength: number;
};

/** 避免与 DOM 的 `Node` 类型冲突 */
class NeuralGraphNode {
  position: THREE.Vector3;
  connections: NeuralGraphConnection[];
  level: number;
  type: number;
  size: number;
  distanceFromRoot: number;

  constructor(position: THREE.Vector3, level = 0, type = 0) {
    this.position = position;
    this.connections = [];
    this.level = level;
    this.type = type;
    this.size =
      type === 0
        ? THREE.MathUtils.randFloat(0.8, 1.4)
        : THREE.MathUtils.randFloat(0.5, 1.0);
    this.distanceFromRoot = 0;
  }

  addConnection(node: NeuralGraphNode, strength = 1.0): void {
    if (!this.isConnectedTo(node)) {
      this.connections.push({ node, strength });
      node.connections.push({ node: this, strength });
    }
  }

  isConnectedTo(node: NeuralGraphNode): boolean {
    return this.connections.some((conn) => conn.node === node);
  }
}

type NeuralNetworkGraph = {
  nodes: NeuralGraphNode[];
  rootNode: NeuralGraphNode | undefined;
};

/** 与 useEffect 内 pulseUniforms 结构一致，供 createNetworkVisualization / triggerPulse 使用 */
type PulseUniformsState = {
  uTime: { value: number };
  uPulsePositions: { value: THREE.Vector3[] };
  uPulseTimes: { value: number[] };
  uPulseColors: { value: THREE.Color[] };
  uPulseSpeed: { value: number };
  uBaseNodeSize: { value: number };
};

export type NeuralNetworkProps = {
  /** 相机位置（世界坐标），默认正对场景中心 */
  cameraPosition?: { x: number; y: number; z: number };
  /** OrbitControls 注视点，把主体「推」向画面左上时设为略靠右下的点 */
  orbitTarget?: { x: number; y: number; z: number };
  /** 进入页面后自动触发一次与点击相同的能量脉冲（仅触发一次） */
  pulseOnMount?: boolean;
  /** 首次脉冲在视口中的位置比例 0~1（默认略靠左上，对准球团区域） */
  pulseOnMountViewport?: { x: number; y: number };
};

const NeuralNetworkBackground = ({
  cameraPosition = { x: 0, y: 8, z: 28 },
  orbitTarget = { x: 0, y: 0, z: 0 },
  pulseOnMount = false,
  pulseOnMountViewport = { x: 0.26, y: 0.34 },
}: NeuralNetworkProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const nodesMeshRef = useRef<THREE.Points | null>(null);
  const connectionsMeshRef = useRef<THREE.LineSegments | null>(null);
  const neuralNetworkRef = useRef<NeuralNetworkGraph | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const starFieldRef = useRef<THREE.Points | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const lastPulseIndexRef = useRef(0);

  // 与 globals.css 主题一致：紫 / 粉 / 丁香辅色（不含绿色）
  const defaultPalette = [
    new THREE.Color(0x7c6ee6),
    new THREE.Color(0x6d5fdd),
    new THREE.Color(0xf38fb2),
    new THREE.Color(0xea7fa8),
    new THREE.Color(0xc4b5fd),
  ];

  // 噪声函数（Shader 用）
  const noiseFunctions = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }`;

  // 节点 Shader
  const nodeShader = {
    vertexShader: `${noiseFunctions}
    attribute float nodeSize;
    attribute float nodeType;
    attribute vec3 nodeColor;
    attribute float distanceFromRoot;
    
    uniform float uTime;
    uniform vec3 uPulsePositions[3];
    uniform float uPulseTimes[3];
    uniform float uPulseSpeed;
    uniform float uBaseNodeSize;
    
    varying vec3 vColor;
    varying float vNodeType;
    varying vec3 vPosition;
    varying float vPulseIntensity;
    varying float vDistanceFromRoot;
    varying float vGlow;
    float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 3.0;
      float waveProximity = abs(distToClick - pulseRadius);
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
    }
    void main() {
      vNodeType = nodeType;
      vColor = nodeColor;
      vDistanceFromRoot = distanceFromRoot;
      vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vPosition = worldPos;
      float totalPulseIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
        totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }
      vPulseIntensity = min(totalPulseIntensity, 1.0);
      float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
      float baseSize = nodeSize * breathe;
      float pulseSize = baseSize * (1.0 + vPulseIntensity * 2.5);
      vGlow = 0.5 + 0.5 * sin(uTime * 0.5 + distanceFromRoot * 0.2);
      vec3 modifiedPosition = position;
      if (nodeType > 0.5) {
        float noise = snoise(position * 0.08 + uTime * 0.08);
        modifiedPosition += normal * noise * 0.15;
      }
      vec4 mvPosition = modelViewMatrix * vec4(modifiedPosition, 1.0);
      gl_PointSize = pulseSize * uBaseNodeSize * (1000.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }`,
    fragmentShader: `
    uniform float uTime;
    uniform vec3 uPulseColors[3];
    
    varying vec3 vColor;
    varying float vNodeType;
    varying vec3 vPosition;
    varying float vPulseIntensity;
    varying float vDistanceFromRoot;
    varying float vGlow;
    void main() {
      vec2 center = 2.0 * gl_PointCoord - 1.0;
      float dist = length(center);
      if (dist > 1.0) discard;
      float glow1 = 1.0 - smoothstep(0.0, 0.5, dist);
      float glow2 = 1.0 - smoothstep(0.0, 1.0, dist);
      float glowStrength = pow(glow1, 1.2) + glow2 * 0.3;
      float breatheColor = 0.9 + 0.1 * sin(uTime * 0.6 + vDistanceFromRoot * 0.25);
      vec3 baseColor = vColor * breatheColor;
      vec3 finalColor = baseColor;
      if (vPulseIntensity > 0.0) {
        vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.4);
        finalColor = mix(baseColor, pulseColor, vPulseIntensity * 0.8);
        finalColor *= (1.0 + vPulseIntensity * 1.2);
        glowStrength *= (1.0 + vPulseIntensity);
      }
      float coreBrightness = smoothstep(0.4, 0.0, dist);
      finalColor += vec3(1.0) * coreBrightness * 0.3;
      float alpha = glowStrength * (0.95 - 0.3 * dist);
      float camDistance = length(vPosition - cameraPosition);
      float distanceFade = smoothstep(100.0, 15.0, camDistance);
      if (vNodeType > 0.5) {
        finalColor *= 1.1;
        alpha *= 0.9;
      }
      finalColor *= (1.0 + vGlow * 0.1);
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
    }`
  };

  // 连接 Shader
  const connectionShader = {
    vertexShader: `${noiseFunctions}
    attribute vec3 startPoint;
    attribute vec3 endPoint;
    attribute float connectionStrength;
    attribute float pathIndex;
    attribute vec3 connectionColor;
    
    uniform float uTime;
    uniform vec3 uPulsePositions[3];
    uniform float uPulseTimes[3];
    uniform float uPulseSpeed;
    
    varying vec3 vColor;
    varying float vConnectionStrength;
    varying float vPulseIntensity;
    varying float vPathPosition;
    varying float vDistanceFromCamera;
    float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
      
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 3.0;
      float waveProximity = abs(distToClick - pulseRadius);
      
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
    }
    void main() {
      float t = position.x;
      vPathPosition = t;
      vec3 midPoint = mix(startPoint, endPoint, 0.5);
      float pathOffset = sin(t * 3.14159) * 0.15;
      vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0)));
      if (length(perpendicular) < 0.1) perpendicular = vec3(1.0, 0.0, 0.0);
      midPoint += perpendicular * pathOffset;
      vec3 p0 = mix(startPoint, midPoint, t);
      vec3 p1 = mix(midPoint, endPoint, t);
      vec3 finalPos = mix(p0, p1, t);
      float noiseTime = uTime * 0.15;
      float noise = snoise(vec3(pathIndex * 0.08, t * 0.6, noiseTime));
      finalPos += perpendicular * noise * 0.12;
      vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;
      float totalPulseIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
        totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }
      vPulseIntensity = min(totalPulseIntensity, 1.0);
      vColor = connectionColor;
      vConnectionStrength = connectionStrength;
      
      vDistanceFromCamera = length(worldPos - cameraPosition);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
    }`,
    fragmentShader: `
    uniform float uTime;
    uniform vec3 uPulseColors[3];
    
    varying vec3 vColor;
    varying float vConnectionStrength;
    varying float vPulseIntensity;
    varying float vPathPosition;
    varying float vDistanceFromCamera;
    void main() {
      float flowPattern1 = sin(vPathPosition * 25.0 - uTime * 4.0) * 0.5 + 0.5;
      float flowPattern2 = sin(vPathPosition * 15.0 - uTime * 2.5 + 1.57) * 0.5 + 0.5;
      float combinedFlow = (flowPattern1 + flowPattern2 * 0.5) / 1.5;
      
      vec3 baseColor = vColor * (0.8 + 0.2 * sin(uTime * 0.6 + vPathPosition * 12.0));
      float flowIntensity = 0.4 * combinedFlow * vConnectionStrength;
      vec3 finalColor = baseColor;
      if (vPulseIntensity > 0.0) {
        vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
        finalColor = mix(baseColor, pulseColor * 1.2, vPulseIntensity * 0.7);
        flowIntensity += vPulseIntensity * 0.8;
      }
      finalColor *= (0.7 + flowIntensity + vConnectionStrength * 0.5);
      float baseAlpha = 0.7 * vConnectionStrength;
      float flowAlpha = combinedFlow * 0.3;
      float alpha = baseAlpha + flowAlpha;
      alpha = mix(alpha, min(1.0, alpha * 2.5), vPulseIntensity);
      float distanceFade = smoothstep(100.0, 15.0, vDistanceFromCamera);
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
    }`
  };

  // 生成神经网络结构
  const generateNeuralNetwork = useCallback((densityFactor = 1.0): NeuralNetworkGraph => {
    let nodes: NeuralGraphNode[] = [];
    let rootNode: NeuralGraphNode | undefined;

    const generateCrystallineSphere = () => {
      rootNode = new NeuralGraphNode(new THREE.Vector3(0, 0, 0), 0, 0);
      rootNode.size = 2.0;
      nodes.push(rootNode);
      const layers = 5;
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      for (let layer = 1; layer <= layers; layer++) {
        const radius = layer * 4;
        const numPoints = Math.floor(layer * 12 * densityFactor);
        for (let i = 0; i < numPoints; i++) {
          const phi = Math.acos(1 - 2 * (i + 0.5) / numPoints);
          const theta = 2 * Math.PI * i / goldenRatio;
          const pos = new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
          );
          const isLeaf = layer === layers || Math.random() < 0.3;
          const node = new NeuralGraphNode(pos, layer, isLeaf ? 1 : 0);
          node.distanceFromRoot = radius;
          nodes.push(node);
          if (layer > 1) {
            const prevLayerNodes = nodes.filter(n => n.level === layer - 1 && n !== rootNode);
            prevLayerNodes.sort((a, b) => pos.distanceTo(a.position) - pos.distanceTo(b.position));
            for (let j = 0; j < Math.min(3, prevLayerNodes.length); j++) {
              const dist = pos.distanceTo(prevLayerNodes[j].position);
              const strength = 1.0 - (dist / (radius * 2));
              node.addConnection(prevLayerNodes[j], Math.max(0.3, strength));
            }
          } else {
            rootNode.addConnection(node, 0.9);
          }
        }
        const layerNodes = nodes.filter(n => n.level === layer && n !== rootNode);
        for (let i = 0; i < layerNodes.length; i++) {
          const node = layerNodes[i];
          const nearby = layerNodes.filter(n => n !== node)
            .sort((a, b) => node.position.distanceTo(a.position) - node.position.distanceTo(b.position))
            .slice(0, 5);
          for (const nearNode of nearby) {
            const dist = node.position.distanceTo(nearNode.position);
            if (dist < radius * 0.8 && !node.isConnectedTo(nearNode)) {
              node.addConnection(nearNode, 0.6);
            }
          }
        }
      }
      const outerNodes = nodes.filter(n => n.level >= 3);
      for (let i = 0; i < Math.min(20, outerNodes.length); i++) {
        const n1 = outerNodes[Math.floor(Math.random() * outerNodes.length)];
        const n2 = outerNodes[Math.floor(Math.random() * outerNodes.length)];
        if (n1 !== n2 && !n1.isConnectedTo(n2) && Math.abs(n1.level - n2.level) > 1) {
          n1.addConnection(n2, 0.4);
        }
      }
    };

    generateCrystallineSphere();

    if (densityFactor < 1.0) {
      const targetCount = Math.ceil(nodes.length * Math.max(0.3, densityFactor));
      const toKeep = new Set([rootNode]);
      const sortedNodes = nodes.filter(n => n !== rootNode)
        .sort((a, b) => {
          const scoreA = a.connections.length * (1 / (a.distanceFromRoot + 1));
          const scoreB = b.connections.length * (1 / (b.distanceFromRoot + 1));
          return scoreB - scoreA;
        });
      for (let i = 0; i < Math.min(targetCount - 1, sortedNodes.length); i++) {
        toKeep.add(sortedNodes[i]);
      }
      nodes = nodes.filter(n => toKeep.has(n));
      nodes.forEach((node) => {
        node.connections = node.connections.filter((conn) =>
          toKeep.has(conn.node),
        );
      });
    }

    return { nodes, rootNode };
  }, []);

  // 创建网络可视化
  const createNetworkVisualization = useCallback((pulseUniforms: PulseUniformsState) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (nodesMeshRef.current) {
      scene.remove(nodesMeshRef.current);
      nodesMeshRef.current.geometry.dispose();
      disposeMeshMaterial(nodesMeshRef.current.material);
    }
    if (connectionsMeshRef.current) {
      scene.remove(connectionsMeshRef.current);
      connectionsMeshRef.current.geometry.dispose();
      disposeMeshMaterial(connectionsMeshRef.current.material);
    }

    const neuralNetwork = generateNeuralNetwork(1.0);
    neuralNetworkRef.current = neuralNetwork;

    if (!neuralNetwork || neuralNetwork.nodes.length === 0) return;

    const nodesGeometry = new THREE.BufferGeometry();
    const nodePositions: number[] = [];
    const nodeTypes: number[] = [];
    const nodeSizes: number[] = [];
    const nodeColors: number[] = [];
    const distancesFromRoot: number[] = [];
    const palette = defaultPalette;

    neuralNetwork.nodes.forEach((node) => {
      nodePositions.push(node.position.x, node.position.y, node.position.z);
      nodeTypes.push(node.type);
      nodeSizes.push(node.size);
      distancesFromRoot.push(node.distanceFromRoot);
      const colorIndex = Math.min(node.level, palette.length - 1);
      const baseColor = clampNoGreenDominant(
        jitterBrandColor(palette[colorIndex % palette.length]),
      );
      nodeColors.push(baseColor.r, baseColor.g, baseColor.b);
    });

    nodesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    nodesGeometry.setAttribute('nodeType', new THREE.Float32BufferAttribute(nodeTypes, 1));
    nodesGeometry.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nodeSizes, 1));
    nodesGeometry.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nodeColors, 3));
    nodesGeometry.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(distancesFromRoot, 1));

    const nodesMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(pulseUniforms),
      vertexShader: nodeShader.vertexShader,
      fragmentShader: nodeShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const nodesMesh = new THREE.Points(nodesGeometry, nodesMaterial);
    scene.add(nodesMesh);
    nodesMeshRef.current = nodesMesh;

    const connectionsGeometry = new THREE.BufferGeometry();
    const connectionColors: number[] = [];
    const connectionStrengths: number[] = [];
    const connectionPositions: number[] = [];
    const startPoints: number[] = [];
    const endPoints: number[] = [];
    const pathIndices: number[] = [];
    const processedConnections = new Set();
    let pathIndex = 0;

    neuralNetwork.nodes.forEach((node, nodeIndex) => {
      node.connections.forEach((connection: NeuralGraphConnection) => {
        const connectedNode = connection.node;
        const connectedIndex = neuralNetwork.nodes.indexOf(connectedNode);
        if (connectedIndex === -1) return;
        const key = [Math.min(nodeIndex, connectedIndex), Math.max(nodeIndex, connectedIndex)].join('-');
        if (!processedConnections.has(key)) {
          processedConnections.add(key);
          const startPoint = node.position;
          const endPoint = connectedNode.position;
          const numSegments = 20;
          for (let i = 0; i < numSegments; i++) {
            const t = i / (numSegments - 1);
            connectionPositions.push(t, 0, 0);
            startPoints.push(startPoint.x, startPoint.y, startPoint.z);
            endPoints.push(endPoint.x, endPoint.y, endPoint.z);
            pathIndices.push(pathIndex);
            connectionStrengths.push(connection.strength);
            const avgLevel = Math.min(Math.floor((node.level + connectedNode.level) / 2), palette.length - 1);
            const baseColor = clampNoGreenDominant(
              jitterBrandColor(palette[avgLevel % palette.length]),
            );
            connectionColors.push(baseColor.r, baseColor.g, baseColor.b);
          }
          pathIndex++;
        }
      });
    });

    connectionsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectionPositions, 3));
    connectionsGeometry.setAttribute('startPoint', new THREE.Float32BufferAttribute(startPoints, 3));
    connectionsGeometry.setAttribute('endPoint', new THREE.Float32BufferAttribute(endPoints, 3));
    connectionsGeometry.setAttribute('connectionStrength', new THREE.Float32BufferAttribute(connectionStrengths, 1));
    connectionsGeometry.setAttribute('connectionColor', new THREE.Float32BufferAttribute(connectionColors, 3));
    connectionsGeometry.setAttribute('pathIndex', new THREE.Float32BufferAttribute(pathIndices, 1));

    const connectionsMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(pulseUniforms),
      vertexShader: connectionShader.vertexShader,
      fragmentShader: connectionShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const connectionsMesh = new THREE.LineSegments(connectionsGeometry, connectionsMaterial);
    scene.add(connectionsMesh);
    connectionsMeshRef.current = connectionsMesh;

    palette.forEach((color, i) => {
      if (i < 3) {
        connectionsMaterial.uniforms.uPulseColors.value[i].copy(color);
        nodesMaterial.uniforms.uPulseColors.value[i].copy(color);
      }
    });
  }, [generateNeuralNetwork]);

  // 触发脉冲
  const triggerPulse = useCallback(
    (clientX: number, clientY: number, _pulseUniforms: PulseUniformsState) => {
    const camera = cameraRef.current;
    const nodesMesh = nodesMeshRef.current;
    const connectionsMesh = connectionsMeshRef.current;
    const clock = clockRef.current;
    if (!camera || !nodesMesh || !connectionsMesh || !clock) return;

    const nodesMat = nodesMesh.material as THREE.ShaderMaterial;
    const connectionsMat = connectionsMesh.material as THREE.ShaderMaterial;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interactionPlane = new THREE.Plane();
    const interactionPoint = new THREE.Vector3();

    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    interactionPlane.normal.copy(camera.position).normalize();
    interactionPlane.constant =
      -interactionPlane.normal.dot(camera.position) +
      camera.position.length() * 0.5;

    if (raycaster.ray.intersectPlane(interactionPlane, interactionPoint)) {
      const time = clock.getElapsedTime();
      const lastPulseIndex = lastPulseIndexRef.current;
      const newIndex = (lastPulseIndex + 1) % 3;
      lastPulseIndexRef.current = newIndex;

      nodesMat.uniforms.uPulsePositions.value[newIndex].copy(interactionPoint);
      nodesMat.uniforms.uPulseTimes.value[newIndex] = time;
      connectionsMat.uniforms.uPulsePositions.value[newIndex].copy(
        interactionPoint,
      );
      connectionsMat.uniforms.uPulseTimes.value[newIndex] = time;

      const palette = defaultPalette;
      const randomColor = palette[Math.floor(Math.random() * palette.length)];
      nodesMat.uniforms.uPulseColors.value[newIndex].copy(randomColor);
      connectionsMat.uniforms.uPulseColors.value[newIndex].copy(randomColor);
    }
  },
  [],
);

  // 窗口大小变化
  const handleWindowResize = useCallback(() => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const composer = composerRef.current;
    const bloomPass = bloomPassRef.current;
    if (!camera || !renderer || !composer || !bloomPass) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  }, []);

  // 初始化 Three.js
  useEffect(() => {
    if (!canvasRef.current) return;

    // 初始化场景
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x141022, 0.0019);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x141022);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // 星空背景
    const createStarfield = () => {
      const count = 8000;
      const positions = [];
      const colors = [];
      const sizes = [];
      for (let i = 0; i < count; i++) {
        const r = THREE.MathUtils.randFloat(50, 150);
        const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
        const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
        positions.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
        const colorChoice = Math.random();
        if (colorChoice < 0.65) colors.push(0.94, 0.85, 1);
        else if (colorChoice < 0.88) colors.push(0.84, 0.76, 0.98);
        else colors.push(1, 0.82, 0.91);
        sizes.push(THREE.MathUtils.randFloat(0.1, 0.3));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          attribute float size; attribute vec3 color; varying vec3 vColor; uniform float uTime;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float twinkle = sin(uTime * 2.0 + position.x * 100.0) * 0.3 + 0.7;
            gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            gl_FragColor = vec4(vColor, alpha * 0.8);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      return new THREE.Points(geo, mat);
    };

    const starField = createStarfield();
    scene.add(starField);
    starFieldRef.current = starField;

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controls.minDistance = 8;
    controls.maxDistance = 80;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.enablePan = false;
    controls.target.set(orbitTarget.x, orbitTarget.y, orbitTarget.z);
    controls.update();
    controlsRef.current = controls;

    // 后期处理
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.55, 0.55, 0.68
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    // Pulse Uniforms
    const pulseUniforms = {
      uTime: { value: 0.0 },
      uPulsePositions: { value: [
        new THREE.Vector3(1e3, 1e3, 1e3),
        new THREE.Vector3(1e3, 1e3, 1e3),
        new THREE.Vector3(1e3, 1e3, 1e3)
      ]},
      uPulseTimes: { value: [-1e3, -1e3, -1e3] },
      uPulseColors: { value: [
        new THREE.Color(1, 1, 1),
        new THREE.Color(1, 1, 1),
        new THREE.Color(1, 1, 1)
      ]},
      uPulseSpeed: { value: 18.0 },
      uBaseNodeSize: { value: 0.6 }
    };

    // 时钟
    const clock = new THREE.Clock();
    clockRef.current = clock;

    // 创建初始网络
    createNetworkVisualization(pulseUniforms);

    /** 等 DOM + 静态资源 load 完成后再打脉冲；仅在 mesh 已创建后触发（本 effect 内） */
    let mountPulseCancelled = false;
    let onWindowLoad: (() => void) | null = null;
    if (pulseOnMount) {
      const fireMountPulse = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (mountPulseCancelled) return;
            triggerPulse(
              pulseOnMountViewport.x * window.innerWidth,
              pulseOnMountViewport.y * window.innerHeight,
              pulseUniforms,
            );
          });
        });
      };

      onWindowLoad = () => {
        if (mountPulseCancelled) return;
        fireMountPulse();
      };

      if (typeof document !== 'undefined' && document.readyState === 'complete') {
        queueMicrotask(onWindowLoad);
      } else {
        window.addEventListener('load', onWindowLoad, { once: true });
      }
    }

    // 事件绑定
    const handleCanvasClick = (e: MouseEvent) => {
      triggerPulse(e.clientX, e.clientY, pulseUniforms);
    };

    const handleCanvasTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        triggerPulse(
          e.touches[0].clientX,
          e.touches[0].clientY,
          pulseUniforms,
        );
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);
    renderer.domElement.addEventListener('touchstart', handleCanvasTouch, { passive: false });
    window.addEventListener('resize', handleWindowResize);

    // 动画循环
    const animate = () => {
      const t = clock.getElapsedTime();
      const nodesMesh = nodesMeshRef.current;
      const connectionsMesh = connectionsMeshRef.current;
      const starField = starFieldRef.current;
      const controls = controlsRef.current;
      const composer = composerRef.current;

      if (nodesMesh) {
        (nodesMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
        nodesMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
      }
      if (connectionsMesh) {
        (connectionsMesh.material as THREE.ShaderMaterial).uniforms.uTime.value =
          t;
        connectionsMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
      }

      if (starField) {
        starField.rotation.y += 0.0002;
        (starField.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      }

      controls?.update();
      composer?.render();
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // 清理函数
    return () => {
      mountPulseCancelled = true;
      if (onWindowLoad) {
        window.removeEventListener('load', onWindowLoad);
      }

      if (animationIdRef.current != null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('touchstart', handleCanvasTouch);
      window.removeEventListener('resize', handleWindowResize);

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [
    createNetworkVisualization,
    triggerPulse,
    handleWindowResize,
    cameraPosition.x,
    cameraPosition.y,
    cameraPosition.z,
    orbitTarget.x,
    orbitTarget.y,
    orbitTarget.z,
    pulseOnMount,
    pulseOnMountViewport.x,
    pulseOnMountViewport.y,
  ]);

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#141022'
    }}>
      {/* 字体链接 */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&display=swap" rel="stylesheet" />
      
      {/* Canvas */}
      <canvas ref={canvasRef} style={{
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1
      }} />
    </div>
  );
};

export default NeuralNetworkBackground;