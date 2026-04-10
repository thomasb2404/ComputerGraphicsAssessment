// Initialize WebGL context
function initWebGL(canvas) {
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) throw new Error('WebGL not supported');
  
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  return gl;
}

// Compile a shader
function compileShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
  }
  return shader;
}

// Create shader program
function createProgram(gl, vertexSrc, fragmentSrc) {
  const vertexShader = compileShader(gl, vertexSrc, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSrc, gl.FRAGMENT_SHADER);
  
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
  }
  return program;
}

// Create VAO
function createVao(gl, program, vertices, indices) {
  
  // Create VAO
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // Create VBO
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Create EBO
  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  // Position attribute
  const stride = 11 * Float32Array.BYTES_PER_ELEMENT;
  const positionLocation = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);

  // Colour attribute
  let offset = 3 * Float32Array.BYTES_PER_ELEMENT;
  const colourLocation = gl.getAttribLocation(program, "aColour");
  gl.enableVertexAttribArray(colourLocation);
  gl.vertexAttribPointer(colourLocation, 3, gl.FLOAT, false, stride, offset);

  // Texture coordinates
  offset = 6 * Float32Array.BYTES_PER_ELEMENT;
  const texCoordsLocation = gl.getAttribLocation(program, "aTexCoords");
  gl.enableVertexAttribArray(texCoordsLocation);
  gl.vertexAttribPointer(texCoordsLocation, 2, gl.FLOAT, false, stride, offset);

  // Normal vectors
  offset = 8 * Float32Array.BYTES_PER_ELEMENT;
  const normalLocation = gl.getAttribLocation(program, "aNormal");
  gl.enableVertexAttribArray(normalLocation);
  gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, stride, offset);

  // Tangents
  const tangents = computeTangents(vertices, indices);
  const tangentLocation = gl.getAttribLocation(program, "aTangent");
  const tangentBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, tangents, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(tangentLocation);
  gl.vertexAttribPointer(tangentLocation, 3, gl.FLOAT, false, 0, 0);

  // Unbind VAO
  gl.bindVertexArray(null);

  return vao;
}

function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Temporary 1×1 pixel while image loads
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));

  const image = new Image();
  image.src = url;
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);  

    // Auto-generate mipmaps (requires power-of-2 image)
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      // Non-POT textures must be clamped & non-mipmapped
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };

  return texture;
}

function isPowerOf2(x) {
  return (x & (x - 1)) === 0;
}

function computeTangents(vertices, indices) {

  const stride = 11; // number of floats per vertex
  const vertexCount = vertices.length / stride;
  const tangents = new Float32Array(vertexCount * 3);

  for (let i = 0; i < indices.length; i += 3) {

    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    const v0 = i0 * stride;
    const v1 = i1 * stride;
    const v2 = i2 * stride;

    // Positions
    const p0x = vertices[v0 + 0];
    const p0y = vertices[v0 + 1];
    const p0z = vertices[v0 + 2];
    const p1x = vertices[v1 + 0];
    const p1y = vertices[v1 + 1];
    const p1z = vertices[v1 + 2];
    const p2x = vertices[v2 + 0];
    const p2y = vertices[v2 + 1];
    const p2z = vertices[v2 + 2];

    // UV coordinates
    const uv0x = vertices[v0 + 6];
    const uv0y = vertices[v0 + 7];
    const uv1x = vertices[v1 + 6];
    const uv1y = vertices[v1 + 7];
    const uv2x = vertices[v2 + 6];
    const uv2y = vertices[v2 + 7];

    // Edge vectors
    const e1x = p1x - p0x;
    const e1y = p1y - p0y;
    const e1z = p1z - p0z;
    const e2x = p2x - p0x;
    const e2y = p2y - p0y;
    const e2z = p2z - p0z;

    // UV deltas
    const du1 = uv1x - uv0x;
    const dv1 = uv1y - uv0y;
    const du2 = uv2x - uv0x;
    const dv2 = uv2y - uv0y;

    const denom = du1 * dv2 - du2 * dv1;
    if (Math.abs(denom) < 1e-6) continue;

    const f = 1.0 / denom;
    const tx = f * (dv2 * e1x - dv1 * e2x);
    const ty = f * (dv2 * e1y - dv1 * e2y);
    const tz = f * (dv2 * e1z - dv1 * e2z);

    // Accumulate tangent
    tangents[i0 * 3 + 0] += tx;
    tangents[i0 * 3 + 1] += ty;
    tangents[i0 * 3 + 2] += tz;

    tangents[i1 * 3 + 0] += tx;
    tangents[i1 * 3 + 1] += ty;
    tangents[i1 * 3 + 2] += tz;

    tangents[i2 * 3 + 0] += tx;
    tangents[i2 * 3 + 1] += ty;
    tangents[i2 * 3 + 2] += tz;
  }

  // Normalize tangents
  for (let i = 0; i < vertexCount; i++) {

    const tx = tangents[i * 3 + 0];
    const ty = tangents[i * 3 + 1];
    const tz = tangents[i * 3 + 2];

    const length = Math.sqrt(tx * tx + ty * ty + tz * tz);
    if (length > 0.0) {
      tangents[i * 3 + 0] /= length;
      tangents[i * 3 + 1] /= length;
      tangents[i * 3 + 2] /= length;
    }
  }

  return tangents;
}

class Input {

  constructor(canvas) {
    this.keys = {};
    this.mouseDelta = { x: 0, y: 0 };

    window.addEventListener("keydown", e => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", e => {
      this.keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener("click", () => 
      canvas.requestPointerLock()
    );

    document.addEventListener("mousemove", e => {
      if (document.pointerLockElement === canvas) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });
  }

  isDown(key) {
    return this.keys[key.toLowerCase()];
  }

  consumeMouseDelta() {

    const dx = this.mouseDelta.x;
    const dy = this.mouseDelta.y;

    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;

    return { dx, dy };
  }
}
  