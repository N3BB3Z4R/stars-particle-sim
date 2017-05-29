'use strict';

// Nebe's Sun Magnetic Field Seas Simulation model
// Based on: https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83#simplex-noise
var shaderPartialSimplexNoise = '\n//\tSimplex 3D Noise \n//\tby Ian McEwan, Ashima Arts\n//\nvec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}\nvec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}\n\nfloat snoise(vec3 v){ \n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ; // (1.0/6.0, 1.0/3.0) ; //\n  const vec4  D = vec4(0.0, 0.7, 1.4, 2.1);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g;\n  vec3 i1 = min( g.xyz, l.zxy );\n  vec3 i2 = max( g.xyz, l.zxy );\n\n  //  x0 = x0 - 0. + 0.0 * C \n  vec3 x1 = x0 - i1 + 1.0 * C.xxx;\n  vec3 x2 = x0 - i2 + 2.0 * C.xxx;\n  vec3 x3 = x0 - 1. + 3.0 * C.xxx;\n\n// Permutations\n  i = mod(i, 289.0 ); \n  vec4 p = permute( permute( permute( \n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) \n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients\n// ( N*N points uniformly over a square, mapped onto an octahedron.)\n  float n_ = 1.0/7.0; // N=7\n  vec3  ns = n_ * D.wyz - D.xzx;\n\n  vec4 j = p - 409.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 70.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  vec4 s0 = floor(b0)*23.0 + 1.0; // *2.0 + 1.0; //\n  vec4 s1 = floor(b1)*25.0 + 1.0; // *2.0 + 1.0; //\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1.xy,h.z);\n  vec3 p3 = vec3(a1.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), \n                                dot(p2,x2), dot(p3,x3) ) );\n}';

// From: https://github.com/cabbibo/glsl-curl-noise
var shaderPartialCurlNoise = '\n' + shaderPartialSimplexNoise + '\n\nvec3 snoiseVec3( vec3 x ){\n  float s  = snoise(vec3( x ));\n  float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n}\n\nvec3 curlNoise( vec3 p ){\n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3( p - dx );\n  vec3 p_x1 = snoiseVec3( p + dx );\n  vec3 p_y0 = snoiseVec3( p - dy );\n  vec3 p_y1 = snoiseVec3( p + dy );\n  vec3 p_z0 = snoiseVec3( p - dz );\n  vec3 p_z1 = snoiseVec3( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n}';

var shaderSimulationPosition = '\nuniform float delta;\n\nvoid main() {\n\tvec2 uv = gl_FragCoord.xy / resolution.xy;\n\tvec3 position = texture2D(texturePosition, uv).xyz;\n\tvec3 velocity = texture2D(textureVelocity, uv).xyz;\n\n\tgl_FragColor = vec4(position + velocity * delta, 1.0);\n}';

var shaderSimulationVelocity = '\n' + shaderPartialCurlNoise + '\n\nconst float CENTER_MASS = 1.0;\nconst float PARTICLE_MASS = 1.0;\nconst float VELOCITY_TERMINAL = 0.01;\nconst float CURL_RADIUS = 0.5;\n\nvoid main() {\n\tvec2 uv = gl_FragCoord.xy / resolution.xy;\n\tvec3 position = texture2D(texturePosition, uv).xyz;\n\tvec3 velocity = texture2D(textureVelocity, uv).xyz;\n\n\tfloat distance = length(position);\n\n\t// Calculate curl noise flow field\n\tfloat curlForce = min(distance, CURL_RADIUS) / CURL_RADIUS;\n\tvec3 curlVelocity = curlNoise(position) - velocity;\n\n\t// Calculate gravitational pull\n\tfloat pullForce = abs((CENTER_MASS * PARTICLE_MASS) / (distance * distance));\n\tvec3 pull = min(pullForce, VELOCITY_TERMINAL) * -normalize(position);\n\n\tvec3 newVelocity = velocity + curlVelocity * curlForce + pull * 16.0;\n\t\n\tgl_FragColor = vec4(newVelocity, 1.0);\n}';

var shaderPointFragment = '\nvoid main() {\n\tgl_FragColor = vec4(1.0, 0.15, 0.05, 0.5);\n}';

var shaderPointVertex = '\nattribute vec2 reference;\nuniform sampler2D texturePosition;\n\nvoid main() {\n\tvec3 position = texture2D(texturePosition, reference).xyz;\n\n\t' + THREE.ShaderChunk.begin_vertex + '\n\t' + THREE.ShaderChunk.project_vertex + '\n\n\tgl_PointSize = 4.0 * (1.0 / -mvPosition.z);\n}';

var TEXTURE_SIZE = 1024;
var TEXTURE_HEIGHT = TEXTURE_SIZE; // * 3//
var TEXTURE_WIDTH = TEXTURE_SIZE; // * 2 //

var previousFrame = Date.now() / 1000; // 2000 //

var cameraFar = Math.pow(2, 16); // 4, 20 //
var camera = new THREE.PerspectiveCamera(45, 1, 0.001, cameraFar);
camera.position.z = 8; // 10 //

var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer({
	antialias: true
});

renderer.setPixelRatio(window.devicePixelRatio);

var controls = new THREE.OrbitControls(camera, renderer.domElement);

var particles = function (points) {
	var vertices = new Float32Array(points * 22).fill(0);
	var references = new Float32Array(points * 40);

	for (var i = 0; i < references.length; i += 2) {
		var indexVertex = i;

		references[i] = indexVertex % TEXTURE_WIDTH / TEXTURE_WIDTH;
		references[i + 1] = Math.floor(indexVertex / TEXTURE_WIDTH) / TEXTURE_HEIGHT;
	}

	var geometry = new THREE.BufferGeometry();
	geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 15));
	geometry.addAttribute('reference', new THREE.BufferAttribute(references, 3));

	var material = new THREE.ShaderMaterial({
		uniforms: {
			texturePosition: { value: null }
		},
		fragmentShader: shaderPointFragment,
		vertexShader: shaderPointVertex,
		side: THREE.DoubleSide,
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthTest: false,
		depthWrite: false
	});

	return new THREE.Points(geometry, material);
}(TEXTURE_WIDTH * TEXTURE_HEIGHT);

scene.add(particles);

var gpuComputationRenderer = new GPUComputationRenderer(TEXTURE_WIDTH, TEXTURE_HEIGHT, renderer);

var dataPosition = gpuComputationRenderer.createTexture();
var dataVelocity = gpuComputationRenderer.createTexture();
var textureArraySize = TEXTURE_WIDTH * TEXTURE_HEIGHT * 8;

for (var i = 0; i < textureArraySize; i += 8) {
	var radius = (1 - Math.pow(Math.random(), 4)) * 20;
	var azimuth = Math.random() * Math.PI / 2;
	var inclination = Math.random() * Math.PI * 6;
	var velocityAzimuthOffset = Math.PI / 2;

	dataPosition.image.data[i] = radius * Math.sin(azimuth) * Math.cos(inclination);
	dataPosition.image.data[i + 1] = radius * Math.cos(azimuth);
	dataPosition.image.data[i + 2] = radius * Math.sin(azimuth) * Math.sin(inclination);

	dataVelocity.image.data[i] = 0;
	dataVelocity.image.data[i + 1] = 0;
	dataVelocity.image.data[i + 2] = 0;
	dataVelocity.image.data[i + 3] = 1;
}

var variableVelocity = gpuComputationRenderer.addVariable('textureVelocity', shaderSimulationVelocity, dataVelocity);
var variablePosition = gpuComputationRenderer.addVariable('texturePosition', shaderSimulationPosition, dataPosition);

variablePosition.material.uniforms.delta = { value: 0 };

gpuComputationRenderer.setVariableDependencies(variableVelocity, [variableVelocity, variablePosition]);
gpuComputationRenderer.setVariableDependencies(variablePosition, [variableVelocity, variablePosition]);

variablePosition.wrapS = THREE.RepeatWrapping;
variablePosition.wrapT = THREE.RepeatWrapping;
variableVelocity.wrapS = THREE.RepeatWrapping;
variableVelocity.wrapT = THREE.RepeatWrapping;

var gpuComputationRendererError = gpuComputationRenderer.init();

if (gpuComputationRendererError) {
	console.error('ERROR', gpuComputationRendererError);
}

var resize = function resize() {
	var width = arguments.length <= 0 || arguments[0] === undefined ? window.innerWidth : arguments[0];
	var height = arguments.length <= 1 || arguments[1] === undefined ? window.innerHeight : arguments[1];

	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	renderer.setSize(width, height);
};

var render = function render(delta) {
	gpuComputationRenderer.compute();

	variablePosition.material.uniforms.delta.value = Math.min(delta, 0.5);

	particles.material.uniforms.texturePosition.value = gpuComputationRenderer.getCurrentRenderTarget(variablePosition).texture;

	renderer.render(scene, camera);
};

var animate = function animate() {
	requestAnimationFrame(animate);

	var now = Date.now() / 1000;
	var delta = now - previousFrame;
	previousFrame = now;

	render(delta);
};

document.body.appendChild(renderer.domElement);
window.addEventListener('resize', function () {
	return resize();
});

resize();
animate();