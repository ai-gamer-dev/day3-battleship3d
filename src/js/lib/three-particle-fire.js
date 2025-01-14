/*!
 * @author yomotsu
 * MIT License
 */

const particleFire = {
	THREE: null,
	isInitialized: false
};

particleFire.install = function (options) {
	options = options || {};
	if (!options.THREE) {
		throw new Error('THREE must be provided to initialize particleFire');
	}
	particleFire.THREE = options.THREE;
	particleFire.isInitialized = true;

	// Set up prototypes after THREE is available
	particleFire.Material.prototype = Object.create(options.THREE.ShaderMaterial.prototype);
	particleFire.Material.prototype.constructor = particleFire.Material;

	particleFire.Geometry.prototype = Object.create(options.THREE.BufferGeometry.prototype);
	particleFire.Geometry.prototype.constructor = particleFire.Geometry;
};

particleFire.checkInitialized = function() {
	if (!particleFire.isInitialized || !particleFire.THREE) {
		throw new Error('particleFire must be initialized with THREE before use');
	}
};

particleFire.Material = function (parameters) {
	particleFire.checkInitialized();
	parameters = parameters || {};

	this.color = parameters.color || new particleFire.THREE.Color(0xff2200);
	this.transparent = true;
	this.alphaTest = 0.5;
	this.depthWrite = false;
	this.blending = particleFire.THREE.AdditiveBlending;
	this.vertexColors = true;

	this.clock = new particleFire.THREE.Clock();
	this.uniforms = {
		color: { type: 'c', value: this.color },
		time: { type: 'f', value: 0 },
		size: { type: 'f', value: 2 },
		heightOfNearPlane: { type: 'f', value: 1 }
	};

	this.vertexShader = [
		'attribute vec4 particlePosition;',
		'attribute vec4 particleVelocity;',
		'attribute vec4 particleColor;',
		'uniform float time;',
		'uniform float size;',
		'uniform float heightOfNearPlane;',
		'varying vec4 vColor;',
		'void main() {',
		'vec3 newPosition = vec3( position );',
		'vec3 pos = particlePosition.xyz + particleVelocity.xyz * time;',
		'newPosition = newPosition * particlePosition.w;',
		'newPosition = newPosition + pos;',
		'vColor = particleColor;',
		'vec4 mvPosition = modelViewMatrix * vec4( newPosition, 1.0 );',
		'float pointSize = size * particlePosition.w * heightOfNearPlane / length( mvPosition.xyz );',
		'gl_PointSize = pointSize;',
		'gl_Position = projectionMatrix * mvPosition;',
		'}'
	].join('\n');

	this.fragmentShader = [
		'uniform vec3 color;',
		'varying vec4 vColor;',
		'void main() {',
		'float f = length( gl_PointCoord - vec2( 0.5, 0.5 ) );',
		'if ( f > 0.5 ) discard;',
		'gl_FragColor = vec4( color * vColor.xyz, 1.0 );',
		'}'
	].join('\n');

	particleFire.THREE.ShaderMaterial.call(this, {
		uniforms: this.uniforms,
		vertexShader: this.vertexShader,
		fragmentShader: this.fragmentShader,
		transparent: this.transparent,
		alphaTest: this.alphaTest,
		depthWrite: this.depthWrite,
		blending: this.blending,
		vertexColors: this.vertexColors
	});
};

particleFire.Material.prototype.update = function (delta) {
	this.uniforms.time.value = this.clock.getElapsedTime() * delta;
};

particleFire.Material.prototype.setPerspective = function (fov, height) {
	this.uniforms.heightOfNearPlane.value = Math.abs(height / (2 * Math.tan(particleFire.THREE.MathUtils.degToRad(fov * 0.5))));
};

particleFire.Geometry = function (radius, height, particleCount) {
	particleFire.checkInitialized();
	particleFire.THREE.BufferGeometry.call(this);

	this.radius = radius || 0.5;
	this.height = height || 2;
	this.particleCount = particleCount || 100;

	var positions = [];
	var velocitys = [];
	var colors = [];
	var particlePositions = [];
	var particleVelocitys = [];
	var particleColors = [];
	var color = new particleFire.THREE.Color();

	for (var i = 0; i < this.particleCount; i++) {
		var radius = Math.random() * this.radius;
		var theta = Math.random() * 2 * Math.PI;
		var x = radius * Math.cos(theta);
		var z = radius * Math.sin(theta);
		var y = Math.random() * this.height;

		positions.push(x, y, z);
		velocitys.push(
			(Math.random() - 0.5) * 0.3,
			Math.random() * 0.5 + 0.5,
			(Math.random() - 0.5) * 0.3
		);
		colors.push(
			Math.random() * 0.5 + 0.5,
			Math.random() * 0.5 + 0.5,
			Math.random() * 0.5 + 0.5
		);

		particlePositions.push(
			x, y, z,
			Math.random() * 0.3 + 0.1
		);
		particleVelocitys.push(
			(Math.random() - 0.5) * 0.3,
			Math.random() * 2 + 2,
			(Math.random() - 0.5) * 0.3,
			0
		);

		color.setHSL(0.1, 0.5, Math.random() * 0.3 + 0.7);
		particleColors.push(color.r, color.g, color.b, 1);
	}

	this.setAttribute('position', new particleFire.THREE.Float32BufferAttribute(positions, 3));
	this.setAttribute('particlePosition', new particleFire.THREE.Float32BufferAttribute(particlePositions, 4));
	this.setAttribute('particleVelocity', new particleFire.THREE.Float32BufferAttribute(particleVelocitys, 4));
	this.setAttribute('particleColor', new particleFire.THREE.Float32BufferAttribute(particleColors, 4));
};

export default particleFire; 