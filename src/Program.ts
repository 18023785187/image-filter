
export default class Program {
    public readonly canvas: HTMLCanvasElement
    protected readonly gl: WebGLRenderingContext
    protected readonly program: WebGLProgram
    constructor(container: HTMLElement, vertexSource: string, fragmentSource: string) {
        this.canvas = document.createElement('canvas')
        // 设置 preserveDrawingBuffer 保留缓冲，这样 canvas 才能保留图片
        this.gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true })!
        this.program = this.initProgram(vertexSource, fragmentSource)

        container.appendChild(this.canvas)
    }
    /**
     * 初始化
     */
    private initProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        const { gl } = this
        const vertexShader = this.createShader(
            gl.VERTEX_SHADER, vertexSource
        )
        const fragmentShader = this.createShader(
            gl.FRAGMENT_SHADER, fragmentSource
        )
        const program = this.createProgram(vertexShader, fragmentShader)

        gl.linkProgram(program) // 连接两个着色器
        gl.useProgram(program) // 告诉 webgl 使用 program 进行渲染

        return program
    }

    /**
     * 创建着色器
     * @param shaderType 着色器类型
     * @param source 着色器源码
     * @returns 着色器
     */
    private createShader(shaderType: number, source: string): WebGLShader {
        const { gl } = this
        const shader = gl.createShader(shaderType)!
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        return shader
    }

    /**
     * 创建主程序
     * @param vertexShader 顶点着色器
     * @param fragmentShader 片元着色器
     * @returns 主程序
     */
    private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
        const { gl } = this
        const program = gl.createProgram()!
        gl.attachShader(program, vertexShader)
        gl.attachShader(program, fragmentShader)
        return program
    }

    /**
     * 设置视口宽高
     * @param width 
     * @param height 
     */
    public setViewport(width: number, height: number): void {
        [this.canvas.width, this.canvas.height] = [width, height]
        this.gl.viewport(0, 0, width, height)
    }
}