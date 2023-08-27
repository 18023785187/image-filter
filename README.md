# 图形滤波器

#### 使用

```
npm i @qq1069532844/image-filter
```

```html
<div id="container"></div>

<script>
    const imageFilter = new ImageFilter(document.getElementById('container'))

    // 加载图片
    imageFilter.loadImage(url)

    // 应用效果
    imageFilter.handleEffect(
        imageFilter.getKernelNames()
    )
</script>
```

#### 本地调试

```
npm run dev
```

#### 打包

```
npm run build
```

## api

#### ImageEditor.canvas: HTMLCanvasElement

获取 canvas 元素

#### ImageEditor.imageSize: [number, number]

获取加载图片的宽高

#### ImageEditor.loadImage(url: string | image: HTMLImageElement): Promise<HTMLImageElement>

加载图片

#### ImageEditor.setKernels(name: KernelName, kernel: number[]): void

设置新的图像处理内核，name 为内核名，kernel 为 3 x 3 内核

#### ImageEditor.getKernelNames(): KernelName[]

获取当前绑定的所有内核名的数组

#### ImageEditor.handleEffect(kernelNames: KernelName[] = []): void

为图像应用滤波器，kernelNames 为要应用的内核名数组

#### ImageEditor.setViewport(width: number, height: number): void

重置 canvas 大小
