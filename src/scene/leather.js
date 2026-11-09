import * as THREE from 'three';

// Cuir matelassé procédural : le modèle n'a pas de coordonnées UV, le motif est donc
// projeté en triplanaire dans l'espace monde (losanges, surpiqûres, grain).
export function patchLeather(mat, { quilt = 1, grain = 1 } = {}) {
  const u = { uQuilt: { value: quilt }, uGrain: { value: grain } };
  mat.userData.leather = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN; uniform float uQuilt; uniform float uGrain;
float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
vec2 planar(vec3 p, vec3 n){ vec3 a=abs(n); return (a.y>a.x && a.y>a.z) ? p.xz : (a.x>a.z ? p.zy : p.xy); }
float quiltH(out float stitch){
  vec2 q = planar(vWP, vWN) * 13.0;
  vec2 r = vec2(q.x+q.y, q.x-q.y) * 0.5;
  vec2 f = abs(fract(r) - 0.5);
  float e = max(f.x, f.y) * 2.0;
  stitch = smoothstep(0.90, 0.97, e) * (1.0 - smoothstep(0.985, 1.0, e));
  float puff = max(cos(3.14159 * f.x), 0.0) * max(cos(3.14159 * f.y), 0.0);
  float g = vnoise(planar(vWP, vWN) * 70.0);
  return puff * 0.9 * uQuilt;
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ float st; float h0 = quiltH(st); diffuseColor.rgb *= mix(1.0, 0.68, st * uQuilt) * (0.9 + 0.1 * smoothstep(0.0, 0.9, h0)) * (0.97 + 0.06 * uGrain * vnoise(planar(vWP, vWN) * 60.0)); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ float st; float h = quiltH(st); vec2 dh = vec2(dFdx(h), dFdy(h)) * 0.5;
  vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
  vec3 R1 = cross(sy, normal), R2 = cross(normal, sx); float det = dot(sx, R1);
  vec3 grad = sign(det) * (dh.x * R1 + dh.y * R2);
  normal = normalize(abs(det) * normal - grad); }`);
  };
  mat.customProgramCacheKey = () => 'leather-v4';
  mat.needsUpdate = true;
  return mat;
}
