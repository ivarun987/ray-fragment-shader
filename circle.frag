#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;

struct Pixel {
    vec2 coordinate;
    vec3 color;
};

struct Circle {
    float radius;
    vec2 position;
    vec3 color;
};

const vec3 background = vec3(0.1, 0.2, 0.4);

Pixel initPixel(in vec3 color) {
    Pixel pixel = Pixel(
        2.0 * gl_FragCoord.xy / u_resolution.xy - 1.0,                          /* coordinate */
        color                                                                   /* color */
    );
    float ratio = u_resolution.x / u_resolution.y;
    if (ratio > 1.0) {
        pixel.coordinate.x *= ratio;
    } else {
        pixel.coordinate.y /= ratio;
    }
    return pixel;
}

void drawCircle(inout Pixel pixel, in Circle circle) {
    if (length(circle.position - pixel.coordinate) < circle.radius) {
        pixel.color = circle.color;
    }
}

void main(){
    Pixel pixel = initPixel(background);

    Circle circle = Circle(
        0.5,                                                                    /* radius */
        vec2(0.0, 0.0),                                                         /* position */
        vec3(0.2, 0.8, 0.2)                                                     /* color */
    );

    drawCircle(pixel, circle);

    gl_FragColor = vec4(pixel.color, 1.0);
}
