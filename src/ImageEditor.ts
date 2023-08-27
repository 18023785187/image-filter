import Program from "./Program"
import kernels from './kernels'

interface ShaderSource {
    vertexSource: string,
    fragmentSource: string
}

// 着色器程序源码
const shaderSource: ShaderSource = {
    vertexSource: `
        attribute vec4 a_position;
        attribute vec2 a_texturePos;
        varying vec2 v_texturePos; // 纹理绘制的范围
        void main () {
            gl_Position = a_position;
            v_texturePos = a_texturePos;
        }
    `,
    fragmentSource: `
        precision mediump float;
        uniform sampler2D u_image;
        uniform float u_kernel[9]; // 图形卷积，采用 3 x 3
        uniform float u_kernelWeight;
        uniform vec2 u_viewportSize;
        varying vec2 v_texturePos;
        int transformLoc (int row, int col) {
            return (row + 1) * 3 + (col + 1);
        }
        void main () {
            vec2 onePixel = vec2(1.0, 1.0) / u_viewportSize; // 获取当前像素
            vec4 colorSum; // 图形卷积求和
            for(int i = -1; i <= 1; ++i) {
                for(int j = -1; j <= 1; ++j) {
                    colorSum += texture2D(
                        u_image, 
                        v_texturePos + onePixel * vec2(float(i), float(j))
                    ) * u_kernel[transformLoc(i, j)]; // 每个像素都乘卷积得到结果
                }
            }
            gl_FragColor = vec4((colorSum / u_kernelWeight).rgb, 1.0);
        }
    `
}

export type Kernels = Omit<typeof kernels, 'normal'> & { [k: string]: number[] }
export type KernelName = keyof Kernels
/**
 * 图形编辑器
 */
export default class ImageEditor extends Program {
    private readonly kernels: Kernels
    private readonly TEXTURE: number // 使用的纹理单元
    private readonly originTexture: WebGLTexture
    private textures: [WebGLTexture, WebGLTexture]
    private framebuffers: [WebGLFramebuffer, WebGLFramebuffer]
    public imageSize: [number, number] = [0, 0]
    constructor(container: HTMLElement) {
        super(container, shaderSource.vertexSource, shaderSource.fragmentSource)
        this.kernels = { ...kernels }
        delete this.kernels['normal']
        this.TEXTURE = this.gl.TEXTURE0

        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true) // 将纹理坐标点设置为左下角
        this.gl.activeTexture(this.TEXTURE) // 激活纹理单元
        this.createFrame()
        this.originTexture = this.createTexture();
        [
            this.textures,
            this.framebuffers
        ] = this.createTexturesAndFrameBuffers()
    }

    /**
     * 创建框架顶点容纳图形
     */
    private createFrame(): void {
        const { gl } = this
        const a_position = gl.getAttribLocation(this.program, 'a_position')!
        const a_texturePos = gl.getAttribLocation(this.program, 'a_texturePos')!

        const vertices = new Float32Array([
            -1, 1,
            1, 1,
            -1, -1,
            1, -1,
            1, 1,
            -1, -1,
        ])
        const vertexBuffer = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW)

        gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(a_position)

        const texturePos = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0,
            1, 1,
            0, 0,
        ])
        const textureBuffer = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, texturePos, gl.STREAM_DRAW)

        gl.vertexAttribPointer(a_texturePos, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(a_texturePos)
    }

    /**
     * 创建纹理单元
     * @returns 
     */
    private createTexture(): WebGLTexture {
        const { gl } = this

        const texture = gl.createTexture()! // 创建纹理
        gl.bindTexture(gl.TEXTURE_2D, texture) // 绑定纹理
        // 配置纹理参数
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

        return texture
    }

    /**
     * 创建纹理和帧缓冲，用于叠加效果
     * @returns 
     */
    private createTexturesAndFrameBuffers(): [typeof this.textures, typeof this.framebuffers] {
        const { gl } = this

        const textures: WebGLTexture[] = []
        const framebuffers: WebGLFramebuffer[] = []
        for (let i = 0; i < 2; ++i) {
            const texture = this.createTexture()
            textures.push(texture);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            const fbo = gl.createFramebuffer()!
            framebuffers.push(fbo)
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
        }

        return [
            textures as typeof this.textures,
            framebuffers as typeof this.framebuffers
        ]
    }

    /**
     * 加载图片并绘制到 gl 中
     * @param url 
     */
    public loadImage(url: string | HTMLImageElement): Promise<HTMLImageElement> {
        return new Promise((resolve: (image: HTMLImageElement) => void, reject: OnErrorEventHandler) => {
            if (typeof url === 'string') {
                const image = new Image()
                image.src = url

                image.onload = () => resolve(image)
                image.onerror = reject
            } else {
                resolve(url)
            }
        }).then((image) => {
            this.imageSize = [image.width, image.height]
            this.drawImage(image)
            this.handleEffect()
            return image
        })
    }

    /**
     * 绘制图像
     * @param image HTMLImageElement
     */
    private drawImage(image: HTMLImageElement): void {
        const { gl } = this

        gl.bindTexture(gl.TEXTURE_2D, this.originTexture) // 切换到主纹理渲染图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, null) // 告诉 gl 需要在画布中绘制图像

        const u_image = gl.getUniformLocation(this.program, 'u_image')!
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image) // 配置纹理图像, image 为 Image 元素

        gl.uniform1i(u_image, this.TEXTURE) // 通过纹理单元将纹理传送给着色器程序
        gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    /**
     * 用于扩展图形处理核
     * @param name 
     * @param kernel 
     */
    public setKernels(name: KernelName, kernel: number[]) {
        this.kernels[name] = kernel
    }

    /**
     * 获取所有内核名
     * @returns 
     */
    public getKernelNames(): KernelName[] {
        return Object.keys(this.kernels)
    }

    /**
     * 处理叠加图形效果
     * @param kernelNames 内核名数组
     */
    public handleEffect(kernelNames: KernelName[] = []): void {
        const { gl } = this

        const u_viewportSize = gl.getUniformLocation(this.program, 'u_viewportSize')!
        gl.uniform2f(u_viewportSize, this.canvas.width, this.canvas.height)

        const u_kernel = gl.getUniformLocation(this.program, 'u_kernel[0]')!
        const u_kernelWeight = gl.getUniformLocation(this.program, 'u_kernelWeight')!

        gl.bindTexture(gl.TEXTURE_2D, this.originTexture) // 从主纹理（原图）开始叠加

        let count: number = 0
        for (const name of kernelNames) {
            if(!this.kernels[name]) continue // 不存在内核名对应的内核则跳过
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[count % 2]) // 切换到当前帧缓冲

            drawWithKernel(this.kernels[name]) // 在当前帧缓冲绘制效果图

            gl.bindTexture(gl.TEXTURE_2D, this.textures[count % 2]) // 切换到当前帧缓冲对应的纹理，以便下次绘制时可以在这个纹理上叠加效果
            count++
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null) // 告诉 gl 需要在画布中绘制图像
        drawWithKernel(kernels['normal'])

        /**
         * 计算内核权重
         * @param kernel 
         * @returns 
         */
        function computeKernelWeight(kernel: number[]): number {
            const weight = kernel.reduce((prev, curr) => {
                return prev + curr;
            });
            return weight <= 0 ? 1 : weight;
        }

        /**
         * 绘制效果图
         * @param kernels 
         */
        function drawWithKernel(kernels: number[]): void {
            gl.uniform1fv(u_kernel, kernels);
            gl.uniform1f(u_kernelWeight, computeKernelWeight(kernels))
            gl.drawArrays(gl.TRIANGLES, 0, 6)
        }
    }

    public setViewport(width: number, height: number): void {
        const { gl } = this
        super.setViewport(width, height)
        // 刷新叠加纹理的宽高
        this.textures.forEach(texture => {
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        })
        this.handleEffect()
    }
}