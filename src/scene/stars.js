import * as THREE from 'three';

// Ciel étoilé : panneau noir mat + fibres optiques (points additifs qui scintillent).
export function buildHeadliner(bounds) {
  const { x0, x1, z0, z1, y } = bounds;
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0),
    new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
  panel.rotation.x = Math.PI / 2; panel.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.add(panel);

  const N = 1100; const pos = new Float32Array(N * 3), ph = new Float32Array(N), sz = new Float32Array(N), tn = new Float32Array(N);
  let s = 1337; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) {
    pos[i * 3] = x0 + rnd() * (x1 - x0); pos[i * 3 + 1] = y - 0.002; pos[i * 3 + 2] = z0 + rnd() * (z1 - z0);
    ph[i] = rnd() * 6.283; sz[i] = Math.pow(rnd(), 3.2) * 2.4 + 0.7; tn[i] = rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  geo.setAttribute('aTone', new THREE.BufferAttribute(tn, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uOn: { value: 1 } },
    vertexShader: `attribute float aPhase; attribute float aSize; attribute float aTone; uniform float uTime; uniform float uPx; uniform float uOn;
      varying float vA; varying float vT;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        float tw = 0.62 + 0.38 * sin(uTime * (0.6 + aTone * 1.8) + aPhase);
        vA = tw * uOn; vT = aTone; gl_PointSize = aSize * uPx * clamp(2.6 / -mv.z, 0.5, 3.0); }`,
    fragmentShader: `uniform vec3 uTint; varying float vA; varying float vT;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d); a *= a;
        vec3 col = mix(vec3(0.85,0.92,1.0), vec3(1.0,0.9,0.72), vT) * uTint;
        gl_FragColor = vec4(col * a * vA * 1.6, a * vA); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; g.add(pts);
  return { group: g, material: mat };
}
