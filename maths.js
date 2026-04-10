// Vector operations
function printVector(v) {
  return `[ ${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)} ]`;
}

function addVector(a, b) {
  return [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];
}

function subtractVector(a, b) {
  return [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];
}

function scaleVector(v, k) {
  return [ k * v[0], k * v[1], k * v[2] ];
}

function length(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function normalize(v) {
  const len = length(v);
  if (len === 0) return [0, 0, 0];
  return scaleVector(v, 1 / len);
}

function dot(a, b) {
  return  a[0] * b[0] + a[1] * b[1] +a[2] * b[2];
}

function cross(a, b) {
  return [ 
    a[1] * b[2] - a[2] * b[1], 
    a[2] * b[0] - a[0] * b[2], 
    a[0] * b[1] - a[1] * b[0] 
  ];
}

// 4x4 Matrix class
class Mat4 {
  constructor() {
    this.m = new Float32Array(16);
    this.identity();
  }

  identity() {
    const m = this.m;
    m[0] = 1; m[4] = 0; m[8]  = 0; m[12] = 0;
    m[1] = 0; m[5] = 1; m[9]  = 0; m[13] = 0;
    m[2] = 0; m[6] = 0; m[10] = 1; m[14] = 0;
    m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
    return this;
  }

  set(values) {
    this.m.set(values);
    return this;
  }

  print() {
    const m = this.m;
    let string = "";
    for (let i = 0; i < 4; i++) {
      const row = [
        m[i * 4 + 0].toFixed(2).padStart(8),
        m[i * 4 + 1].toFixed(2).padStart(8),
        m[i * 4 + 2].toFixed(2).padStart(8),
        m[i * 4 + 3].toFixed(2).padStart(8),
      ];
      string += "  [" + row.join(" ") + " ]\n";
    }
    return string;
  }

  copy(mat) {
    this.m.set(mat.m);
    return this;
  }

  transpose() {
    const m = this.m;
    let tmp;
    tmp = m[1];  m[1]  = m[4];  m[4]  = tmp;
    tmp = m[2];  m[2]  = m[8];  m[8]  = tmp;
    tmp = m[3];  m[3]  = m[12]; m[12] = tmp;
    tmp = m[6];  m[6]  = m[9];  m[9]  = tmp;
    tmp = m[7];  m[7]  = m[13]; m[13] = tmp;
    tmp = m[11]; m[11] = m[14]; m[14] = tmp;
    return this
  }

  multiply(mat) {
    const result = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k  = 0; k < 4; k++) {
          sum += this.m[row + k * 4] * mat.m[k + col * 4];
        }
        result[row + col * 4] = sum;
      }
    }
    this.set(result);
    return this;
  }

  inverse() {
    let m = this.m;
    const inv = new Float32Array([
      m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10],
      -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10],      
      m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7]  - m[13] * m[3] * m[6],      
      -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7]  + m[9] * m[3] * m[6],

      -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10],
      m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10],
      -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7]  + m[12] * m[3] * m[6],
      m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7]  - m[8] * m[3] * m[6],

      m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9],
      -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9],
      m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7]  - m[12] * m[3] * m[5],
      -m[0] * m[5] * m[11] + m[0] * m[7] * m[9]  + m[4] * m[1] * m[11] - m[4] * m[3] * m[9]  - m[8] * m[1] * m[7]  + m[8] * m[3] * m[5],

      -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9],
      m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9],
      -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6]  + m[12] * m[2] * m[5],
      m[0] * m[5] * m[10] - m[0] * m[6] * m[9]  - m[4] * m[1] * m[10] + m[4] * m[2] * m[9]  + m[8] * m[1] * m[6]  - m[8] * m[2] * m[5]
    ]);

    let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
    if (det === 0) {
      console.error("Matrix is singular, no inverse exists");
      return null;
    }

    det = 1 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] *= det;
    }
    this.set(inv);
    return this;
  }

  translate(t) {
    const [x, y, z] = t;
    const transMatrix = new Mat4().set([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ]);
    return this.multiply(transMatrix);
  }

  scale(s) {
    const [x, y, z] = s;
    const scaleMatrix = new Mat4().set([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1
    ]);
    return this.multiply(scaleMatrix);
  }

  rotate(axis, angle) {   
    axis = normalize(axis);
    const [x, y, z] = axis;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const rotateMatrix = new Mat4().set([
      t * x * x + c,      t * x * y + s * z,  t * x * z - s * y,  0,
      t * y * x - s * z,  t * y * y + c,      t * y * z + s * x,  0,
      t * z * x + s * y,  t * z * y - s * x,  t * z * z + c,      0,
      0, 0, 0, 1
    ]);
    return this.multiply(rotateMatrix);
  }
}