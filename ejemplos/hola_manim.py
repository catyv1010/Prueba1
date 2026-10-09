from manim import *

class Hola(Scene):
    def construct(self):
        titulo = Text("Videos hermosos con código", gradient=(BLUE, PURPLE)).scale(0.9)
        circulo = Circle(color=TEAL).scale(1.5)
        cuadrado = Square(color=PINK).scale(1.5)
        self.play(Write(titulo))
        self.play(titulo.animate.to_edge(UP))
        self.play(Create(circulo))
        self.play(Transform(circulo, cuadrado))
        self.play(Rotate(circulo, PI / 2), run_time=1)
        self.wait()
