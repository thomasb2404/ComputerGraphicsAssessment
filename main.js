//Define vertex shader
const vertexShader = 
    `#version 300 es
    precision mediump float;

    in vec3 aPosition;
    in vec3 aColour;
    in vec2 aTexCoords;
    in vec3 aNormal;
    in vec3 aTangent;

    out vec3 vColour;
    out vec2 vTexCoords;
    out vec3 vNormal;
    out vec3 vPosition;
    out vec3 vTangent;
    out vec3 vBitangent;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;


    void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);

        // Output vertex colour
        vColour = aColour;

        // Output texture coordinates
        vTexCoords = aTexCoords;

        // Output world space normal vectors
        vNormal = normalize(mat3(transpose(inverse(uModel))) * aNormal);

        // Output world space vertex position
        vPosition = vec3(uModel * vec4(aPosition, 1.0));

        // Output world space tangent and bitangent vectors
        vTangent = normalize(mat3(uModel) * aTangent);
        vBitangent = normalize(cross(vNormal, vTangent));
    }`;

// Define fragment shader
const fragmentShader = 
    `#version 300 es
    precision mediump float;

    in vec3 vColour;
    in vec2 vTexCoords;
    in vec3 vNormal;
    in vec3 vPosition;
    in vec3 vTangent;
    in vec3 vBitangent;

    out vec4 fragColour;

    uniform sampler2D uTexture;
    uniform sampler2D uNormalMap;
    uniform sampler2D uSpecularMap;
    uniform vec3 uCameraPosition;

    // Material coefficients
    uniform float uKa;
    uniform float uKd;
    uniform float uKs;
    uniform float uShininess;
    uniform bool uHasDiffuseMap;
    uniform bool uHasNormalMap;
    uniform bool uHasSpecularMap;

    // Light struct
    struct Light {
        vec3 position;
        vec3 colour;
        float constant;
        float linear;
        float quadratic;
        int type;
        vec3 direction;
        float cutoff;
        float outerCutoff;
    };

    // Number of lights
    uniform int uNumLights;

    // Array of lights
    uniform Light uLights[16];

    // Function to compute the lighting
    vec3 computeLighting(Light light, vec3 N, vec3 V, vec3 objectColour){
        // Light vector
        vec3 L = normalize(light.position - vPosition);

        // Attenuation
        float distance = length(light.position - vPosition);
        float attenuation = 1.0 / (
        light.constant +
        light.linear * distance +
        light.quadratic * distance * distance);


        // Spotlight intensity
        float intensity = 1.0;
        if (light.type == 1) {
            float theta = dot(-L, normalize(light.direction));
            float epsilon = light.cutoff - light.outerCutoff;
            intensity = clamp((theta - light.outerCutoff) / epsilon, 0.0, 1.0);
        }
        
        // Directional light
        if (light.type == 2) {
            L = normalize(-light.direction);
            attenuation = 1.0;
        }

        // Ambient light
        vec3 ambient = uKa * objectColour;

        // Diffuse light
        float diff = max(dot(N, L), 0.0);
        vec3 diffuse = uKd * max(dot(N, L), 0.0) * light.colour * objectColour;

        // Specular light
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), uShininess);
        vec3 specular = uKs * spec * light.colour;

        // Apply specular map only if defined
        if (uHasSpecularMap) {
            specular *= texture(uSpecularMap, vTexCoords).rgb;
        }

        // Output fragment colour
        return attenuation * (ambient + intensity * (diffuse + specular));
    }

    // Main fragment shader function
    void main() {

        // Object colour
        vec4 objectColour = vec4(vColour, 1.0);
        if (uHasDiffuseMap) {
            objectColour = texture(uTexture, vTexCoords);
        }

        // Lighting vectors
        vec3 N = normalize(vNormal);
        vec3 V = normalize(uCameraPosition - vPosition);

        /// Apply normal map
        if (uHasNormalMap) {
            vec3 T = normalize(vTangent);
            vec3 B = cross(N, T);
            mat3 TBN = mat3(T, B, N);

            vec3 normalSample = texture(uNormalMap, vTexCoords).rgb * 2.0 - 1.0;
            N = normalize(TBN * normalSample);
        }

        // Calculate lighting for each light source
        vec3 lighting;
        for (int i = 0; i < uNumLights; i++) {
            lighting += computeLighting(uLights[i], N, V, objectColour.rgb);
        }

        // Fragment colour
        fragColour = vec4(lighting, objectColour.a);
    }`;

// Define vertex and fragment shaders for the light source
const lightVertexShader =
    `#version 300 es
    precision mediump float;

    in vec3 aPosition;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;

    void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
    }`;

const lightFragmentShader =
    `#version 300 es
    precision mediump float;

    out vec4 fragColour;

    uniform vec3 uLightColour;

    void main() {
        fragColour = vec4(uLightColour, 1.0);
    }`;

// Main function
function main() {

    // Setup WebGL
    const canvas = document.getElementById("canvasId");
    const gl = initWebGL(canvas);

    //create WebGL program
    const mainProgram = createProgram(gl, vertexShader,fragmentShader)
    const lightProgram = createProgram(gl, lightVertexShader, lightFragmentShader);

    gl.useProgram(mainProgram);

    // Define cube vertices
    const wallVerticies = new Float32Array([
        // x  y  z     R  G  B     u  v     nx  ny  nz                  
        // front                                        
        -1, -1,  1,    0, 0, 0,    0, 0,    0,  0,  1, 
         1, -1,  1,    0, 0, 0,    1, 0,    0,  0,  1,     
         1,  1,  1,    0, 0, 0,    1, 1,    0,  0,  1,  
        -1, -1,  1,    0, 0, 0,    0, 0,    0,  0,  1,  
         1,  1,  1,    0, 0, 0,    1, 1,    0,  0,  1,  
        -1,  1,  1,    0, 0, 0,    0, 1,    0,  0,  1,  
        // right                        
         1, -1,  1,    0, 0, 0,    0, 0,    1,  0,  0,
         1, -1, -1,    0, 0, 0,    1, 0,    1,  0,  0, 
         1,  1, -1,    0, 0, 0,    1, 1,    1,  0,  0,
         1, -1,  1,    0, 0, 0,    0, 0,    1,  0,  0,
         1,  1, -1,    0, 0, 0,    1, 1,    1,  0,  0,
         1,  1,  1,    0, 0, 0,    0, 1,    1,  0,  0,
        // back
         1, -1, -1,    0, 0, 0,    0, 0,    0,  0,  -1,
        -1, -1, -1,    0, 0, 0,    1, 0,    0,  0,  -1,
        -1,  1, -1,    0, 0, 0,    1, 1,    0,  0,  -1,
         1, -1, -1,    0, 0, 0,    0, 0,    0,  0,  -1,
        -1,  1, -1,    0, 0, 0,    1, 1,    0,  0,  -1,
         1,  1, -1,    0, 0, 0,    0, 1,    0,  0,  -1,
        // left
        -1, -1, -1,    0, 0, 0,    0, 0,    -1,  0,  0,
        -1, -1,  1,    0, 0, 0,    1, 0,    -1,  0,  0,
        -1,  1,  1,    0, 0, 0,    1, 1,    -1,  0,  0,
        -1, -1, -1,    0, 0, 0,    0, 0,    -1,  0,  0,
        -1,  1,  1,    0, 0, 0,    1, 1,    -1,  0,  0,
        -1,  1, -1,    0, 0, 0,    0, 1,    -1,  0,  0,
        // bottom
        -1, -1, -1,    0, 0, 0,    0, 0,    0,  -1,  0,
         1, -1, -1,    0, 0, 0,    1, 0,    0,  -1,  0,
         1, -1,  1,    0, 0, 0,    1, 1,    0,  -1,  0,
        -1, -1, -1,    0, 0, 0,    0, 0,    0,  -1,  0,
         1, -1,  1,    0, 0, 0,    1, 1,    0,  -1,  0, 
        -1, -1,  1,    0, 0, 0,    0, 1,    0,  -1,  0,
        // top
        -1,  1,  1,    0, 0, 0,    0, 0,    0,  1,  0,
         1,  1,  1,    0, 0, 0,    1, 0,    0,  1,  0,
         1,  1, -1,    0, 0, 0,    1, 1,    0,  1,  0,
        -1,  1,  1,    0, 0, 0,    0, 0,    0,  1,  0,
         1,  1, -1,    0, 0, 0,    1, 1,    0,  1,  0,
        -1,  1, -1,    0, 0, 0,    0, 1,    0,  1,  0,
    ]);

    // Define cube indices
    const wallIndices = new Uint16Array([
        0,  1,  2,  3,  4,  5,  // front
        6,  7,  8,  9, 10, 11,  // right
        12, 13, 14, 15, 16, 17,  // back
        18, 19, 20, 21, 22, 23,  // left
        24, 25, 26, 27, 28, 29,  // bottom
        30, 31, 32, 33, 34, 35   // top
    ]);

    // Define floor vertices
    const floorVertices = new Float32Array([
        // x y   z     R  G  B     u  v     nx  ny  nz
        -1,  0,  1,    0, 0, 0,    0, 0,    0,  1,  0,
        1,  0,  1,    0, 0, 0,    4, 0,    0,  1,  0,
        1,  0, -1,    0, 0, 0,    4, 4,    0,  1,  0,
        -1,  0, -1,    0, 0, 0,    0, 4,    0,  1,  0,
    ]);

    // Define floor indices
    const floorIndices = new Uint16Array([
        0,  1,  2,  
        0,  2,  3,
    ]);

    const wall = {
        position : [11,2.5,-6],
        rotateAxis : [0, 0, 0],
        rotation : 0,
        scale : [0.5,3,5],
        ka        : 0.4,
        kd        : 0.6,
        ks        :0.2,
        shininess : 16,
    }

    const floor = {
        position : [6,-0.5,-6],
        rotateAxis : [0,0,0],
        rotation : 0,
        scale : [10,1,10],
        ka        : 0.5,
        kd        : 0.4,
        ks        : 0.2,
        shininess : 16,
    }
    //Create wall VAO
    const wallVao = createVao(gl, mainProgram, wallVerticies, wallIndices);
    // Define floor VAO
    const floorVao = createVao(gl, mainProgram, floorVertices, floorIndices);

    //Load Wall Texture
    const wallTexture = loadTexture(gl, "assets/bricks_diffuse.png")
    const wallNormalMap = loadTexture(gl, "assets/bricks_normal.png");
    const wallSpecularMap = loadTexture(gl, "assets/bricks_specular.png");

    // Load floor textures
    const floorTexture = loadTexture(gl, "assets/stones.png");
    const floorNormalMap = loadTexture(gl, "assets/stones_normal.png");
    const floorSpecularMap = loadTexture(gl, "assets/stones_specular.png");

    //Create Camera Object
    const camera = new Camera();
    camera.eye = [6,1,5];

    //Keyboard and mouse inputs
    const input = new Input(canvas);

    //Add light sources
    const lightSources = new LightSources();

    // Create Light Object
    const light = new Light();
    light.position = [6, 3, 0];
    light.linear = 0;
    light.quadratic = 0;
    lightSources.addLight(light);

    //timer
    let lastTime = 0;

    render();


    function render(time)
    {
        //Manual init call, no timing yet
        if(time == null)
        {
            requestAnimationFrame(render);
            return;
        }

        //clear frame buffers
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        //Set shader program
        gl.useProgram(mainProgram);

        //update camera
        const dt = (time - lastTime) * 0.001;
        lastTime = time;
        camera.update(input, dt);

        //calculate view matrix
        const view = camera.getViewMatrix();

        //calculate projection matrix 
        const projection = camera.getPerspectiveMatrix();

        // Send view and project matrices to the shaders
        gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, "uView"), false, view.m);
        gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, "uProjection"), false, projection.m);

        //send camera position to shader
        gl.uniform3fv(gl.getUniformLocation(mainProgram, "uCameraPosition"), camera.eye);

        
        drawObject(wall, wallTexture, wallNormalMap, wallSpecularMap, wallIndices, wallVao, true, true, true);

        drawObject(floor, floorTexture, floorNormalMap, floorSpecularMap, floorIndices, floorVao, true, true, true);
        
        //Draw light sources
        gl.useProgram(lightProgram);

        for (let i = 0; i < lightSources.lights.length; i++) {
            // Don't draw directional light source
            if (lightSources.lights[i].type == 2) continue;

            // Calculate model matrix for light source
            const model = new Mat4()
                .translate(lightSources.lights[i].position)
                .scale([0.1, 0.1, 0.1]);

            // Send model, view and projection matrices to the shaders
            gl.uniformMatrix4fv(gl.getUniformLocation(lightProgram, "uModel"), false, model.m);
            gl.uniformMatrix4fv(gl.getUniformLocation(lightProgram, "uView"), false, view.m);
            gl.uniformMatrix4fv(gl.getUniformLocation(lightProgram, "uProjection"), false, projection.m);

            // Send light colour to the shader
            gl.uniform3fv(gl.getUniformLocation(lightProgram, "uLightColour"), lightSources.lights[i].colour);

            // Draw light source cube
            gl.bindVertexArray(wallVao);
            gl.drawElements(gl.TRIANGLES, wallIndices.length, gl.UNSIGNED_SHORT, 0);
        }

        requestAnimationFrame(render);
    }

    function drawObject(object, texture, normalMap, specularMap, indicies, vao, hasDiffuseMap, hasNormalMap, hasSpecularMap)
    {
        //calculate model matrix
        const model = new Mat4()
            .translate(object.position)
            .rotate(object.rotateAxis, object.rotation)
            .scale(object.scale);

        //send model matrix to the shader
        gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram,"uModel"), false, model.m);

        //Send object light properties to shader
        gl.uniform1f(gl.getUniformLocation(mainProgram, "uKa"), object.ka);
        gl.uniform1f(gl.getUniformLocation(mainProgram, "uKd"), object.kd);
        gl.uniform1f(gl.getUniformLocation(mainProgram, "uKs"), object.ks);
        gl.uniform1f(gl.getUniformLocation(mainProgram, "uShininess"), object.shininess);

        //send light sources to shader
        lightSources.toShader(gl, mainProgram);

        //Bind Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(mainProgram, "uTexture"), 0);

        //send texture flags to shader
        gl.uniform1i(gl.getUniformLocation(mainProgram, "uHasDiffuseMap"), hasDiffuseMap);
        gl.uniform1i(gl.getUniformLocation(mainProgram, "uHasNormalMap"), hasNormalMap);
        gl.uniform1i(gl.getUniformLocation(mainProgram, "uHasSpecularMap"), hasSpecularMap);

        if(hasNormalMap)
        {
            // Bind normal map
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, normalMap);
            gl.uniform1i(gl.getUniformLocation(mainProgram, "uNormalMap"), 1);
        }
        
        if(hasSpecularMap)
        {
            // Bind specular map
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, specularMap);
            gl.uniform1i(gl.getUniformLocation(mainProgram, "uSpecularMap"), 2);
        }
        

        // Draw the triangles
        gl.bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES, indicies.length, gl.UNSIGNED_SHORT, 0);
    }
}

main();
