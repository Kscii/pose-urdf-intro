# URDF、End 与 FK 入门：内容维护稿

> 受众：会写代码，但基本不了解 ROS、URDF、TF 和机器人运动学的数据处理开发人员
> 正式演示文件：`slides.md`

## 1. 分享目标

这份 PPT 用 A2D 构型解释如何从机器人结构文件、H5 / rosbag 中的关节数据，以及 End 结果中理解末端位姿。

听众应在分享后理解：

1. URDF 如何用 link、joint、origin、axis、type 描述机器人结构。
2. End Pose 必须说明 reference link、reference frame、timestamp、position、orientation。
3. FK 如何把关节空间中的 joint values 映射成笛卡尔空间中的 End Pose。
4. 代码里为什么会反复使用 4×4 transform 和 `@` 矩阵乘法。

## 2. 内容边界

包含：

- A2D 全身 link-joint-link 结构图。
- A2D.urdf 中的真实 joint、fixed frame、gripper center 代码片段。
- URDF 静态定义与 TF 运行时结果的区别。
- H5 中 End 结构示例。
- XYZ 坐标轴颜色约定。
- base_link 坐标系与 world 坐标系的区别。
- Action End、State End、Raw End、Verify End、TCP End。
- DWHEEL Raw End 与统一 End 定义不一致的反例。
- 运动学、FK/IK 对比、DH 参数、FK 伪代码。

不展开：

- 动力学、控制器设计、轨迹优化。
- IK 数值求解。
- 完整生产流程和配置 schema。
- 复杂 quaternion / rotation matrix 推导。

## 3. 页序

### 第 1 页：封面

标题：URDF、End 与 FK

说明：

- 从 A2D 的 URDF、H5 关节数据和 End 结果出发。
- 目标是让开发人员能看懂结构、语义和 FK 代码之间的关系。

### 第 2 页：URDF 模块分隔页

说明：

- URDF 回答“机器人结构是什么”。
- 本模块重点是 link、joint、origin、axis、type 和语义 frame。

### 第 3 页：A2D：从底盘 base_link 到 effector 的完整链路

页面内容：

- 使用 `a2d-foxglove-side-frames.png` 和 `a2d-foxglove-top-frames.png`。
- 说明 A2D 从底盘 `base_link` 到 effector 的完整结构是反复连接的 `link → joint → link`。

讲解提示：

- 先用全身图建立直觉，再进入 URDF 代码。
- 侧视图和俯视图都用于说明完整结构，不需要逐个 frame 读完。

### 第 4 页：URDF：用 Link 和 Joint 描述机器人

页面内容：

- 使用 `A2D.urdf` 中 `joint_left_arm_mount` 和 `left_arm_joint6` 的真实代码。
- 表格解释 `parent/child`、`origin xyz/rpy`、`type`、`axis`。
- XML 里保留短注释，帮助讲解固定安装和可动关节。

讲解提示：

- `fixed` joint 没有运行时 q，但它的 origin 仍是结构的一部分。
- `revolute` joint 当前角度来自 H5 / rosbag。

### 第 5 页：`origin` 是安装位置，不是当前关节角

页面内容：

- 使用 `left_arm_joint6` 片段说明 `origin`、`axis`、运行时 `q6` 的区别。
- 展示 `T_origin @ rotation_transform(axis, q6)`。

讲解提示：

- `origin rpy` 是固定安装旋转。
- `axis="0 0 -1"` 是运行时运动轴，不代表当前角度。

### 第 6 页：从 URDF Tree 里取出一条 End Chain

页面内容：

- 使用 `Joint_hand_l` 和 `gripper_center_joint` 的真实代码。
- 说明 `gripper_center` 可以是没有 mesh 的语义 frame。

讲解提示：

- End 不一定是最后一个可见零件。
- meshless link 常用于 reference end、TCP、传感器 frame。

### 第 7 页：URDF 是静态定义，TF 是运行时结果

页面内容：

- 左侧表格比较 URDF 和 TF。
- 右侧半页放 `a2d-tf-message-body.png` 和 `a2d-tf-message-arm.png`。

讲解提示：

- URDF 描述结构，TF message 是某一帧的计算结果。
- TF 可用于检查 parent/child、timestamp、translation、quaternion。

### 第 8 页：End 模块分隔页

说明：

- End 回答“描述哪个末端点、相对哪个坐标系、在什么时刻、用什么格式表达”。

### 第 9 页：一条可使用的 End Pose 必须说明什么

页面内容：

- 左侧表格只保留 `字段 | 含义`。
- 在同页补充 orientation 的三种常见表达：Quaternion、Rotation Matrix、RPY。
- 右侧放 `assets/source/一个有end的h5的结构的例子（normalize）.png`。

讲解提示：

- 比较两个 End 前，先确认 reference link、reference frame、timestamp 和姿态约定一致。
- Quaternion 用于 H5 内部保存；Rotation Matrix 用于 FK 计算；RPY 便于人类阅读和 URDF 配置。
- 三种表达描述同一个朝向，可以互相转换。

### 第 10 页：XYZ 坐标轴颜色约定

页面内容：

- 放 `assets/source/单独只有一个关节的图片，可以用于解释坐标轴的颜色.png`。
- 简单说明红 X、绿 Y、蓝 Z。

讲解提示：

- 颜色是可视化工具约定。
- 屏幕方向不等于坐标轴方向，要看 frame 自己的定义。

### 第 11 页：只区分两类：base_link 坐标系与 world 坐标系

页面内容：

- 表格只保留 `base_link` 和 `world` 两类。
- 右侧放地面 world 和基站/第三方相机 world 两张图。

讲解提示：

- `base_link` 是机器人本体上的运动学根 frame。
- `world` 是外部参考系，可以由地面、接地点、基站、第三方相机或标定板定义。

### 第 12 页：DWHEEL：为什么 Raw End 需要统一坐标系

页面内容：

- 使用 `dwheel的baselink的定义和我们的定义不一致.png`。
- 说明部分构型的厂商 Raw End 不以统一 `base_link` 表达。
- DWHEEL 作为例子：厂商 Raw End 参考系在两侧肩膀附近，而不是地盘 `base_link`。

讲解提示：

- 这页重点不是 DWHEEL 这个构型本身，而是说明 Raw End 进入数据流程后必须校验。
- Raw End 比较前要检查 reference frame、endpoint 和 orientation 约定。
- 没有明确固定变换和 endpoint 定义时，不能直接比较 Raw End 与 FK End。

### 第 13 页：Action End、State End、Raw End 与 Verify End

页面内容：

- 表格解释 Action、State、Raw、Verify、TCP。
- 右侧放 Action/State 错位示意图，尽量完整展示，不大幅裁剪。

讲解提示：

- 这些不是五个物理末端，而是数据来源、时间语义、endpoint 语义的组合。
- Raw 与 Verify 不一致时，先检查语义。

### 第 14 页：TCP End：从参考末端到真实工具点

页面内容：

- 使用 TCP 图片辅助讲解。
- 代码：`T_base_tcp = T_base_reference @ T_reference_tcp`。
- 明确说明人形机器人领域里 `tcp_end` 还没有完全统一的行业定义。

讲解提示：

- 本文采用的定义是：reference end + 固定标定偏移。
- TCP 误差可能来自工具安装、夹爪几何或标定偏差。

### 第 15 页：FK 模块分隔页

说明：

- FK 回答“给定一组关节值，末端在哪里”。

### 第 16 页：什么是机器人运动学？

页面内容：

- 解释运动学不考虑力或力矩。
- 区分关节空间和笛卡尔空间。
- 对比 FK 和 IK。

讲解提示：

- 本文主线是 FK：`joint_values + URDF chain → End Pose`。

### 第 17 页：齐次变换矩阵：用代码读懂一个 4×4

页面内容：

- 完整 4×4 `T` 代码。
- `T[:3, :3]` 是旋转矩阵。
- `T[:3, 3]` 是当前位置。
- 展示 `@` 连乘。

讲解提示：

- 矩阵乘法顺序表达 frame 的方向。
- 代码注释只用于提示矩阵区域，不展开推导。

### 第 18 页：DH 参数：标准化的建模语言

页面内容：

- 表格参数名与代码一致：`a`、`alpha`、`d`、`theta`。
- 展示 `dh_transform(a, alpha, d, theta)`。

讲解提示：

- DH 适合讲“参数表 + 变换矩阵 + 连乘”。
- A2D 这类数据更适合直接解析 URDF。

### 第 19 页：从旋转和平移构建一段变换矩阵

页面内容：

- 使用 URDF `origin xyz="0 0.03 0" rpy="0 0 1.5708"` 作为例子。
- 说明 `rpy` 对应旋转矩阵 `R`，`xyz` 对应平移向量 `p`。
- 展示绕 Z 轴旋转 90 度、沿 Y 轴平移 0.03m 后的 4×4 `T_parent_child`。

讲解提示：

- `T[:3, :3] = R`，表示朝向。
- `T[:3, 3] = p`，表示 child frame 原点在 parent frame 里的位置。
- 最后一行固定是 `[0, 0, 0, 1]`。

### 第 20 页：FK Tree：从 base_link 一层一层走到 End

页面内容：

- 使用 `assets/source/a2d-tf-tree-full.png` 单独展示完整 TF tree。
- 强调 FK 先找从 `base_link` 到目标 end 的 parent→child 路径。

讲解提示：

- FK 不是随便挑 joint 相乘，而是必须沿 tree 的路径顺序相乘。
- 最终得到的是 end 在 `base_link` 坐标系下的 pose。

### 第 21 页：沿 base → end 的运动链累积变换

页面内容：

- FK 伪代码。
- 每个 joint 生成 `T_parent_child`，然后 `T = T @ T_parent_child`。
- 代码里有短注释，帮助说明固定安装变换、运行时运动和最终输出。

讲解提示：

- 伪代码假设 joint name mapping、单位、正负号已经处理。
- FK 矩阵算法很短，容易出错的是输入语义。

## 4. 素材清单

| 文件 | 用途 |
|---|---|
| `A2D.urdf` | URDF 代码片段来源 |
| `assets/source/a2d-foxglove-side-frames.png` | A2D 全身侧视结构 |
| `assets/source/a2d-foxglove-top-frames.png` | A2D 全身俯视结构 |
| `assets/source/a2d-tf-message-body.png` | URDF/TF 对比页右侧辅助图 |
| `assets/source/a2d-tf-message-arm.png` | URDF/TF 对比页右侧辅助图 |
| `assets/source/a2d-tf-tree-full.png` | FK 算法页完整 TF tree |
| `assets/source/一个有end的h5的结构的例子（normalize）.png` | End 数据契约页 H5 示例 |
| `assets/source/单独只有一个关节的图片，可以用于解释坐标轴的颜色.png` | XYZ 颜色约定 |
| `assets/source/基于地面的世界坐标系的例子，具体内容看文档.png` | world/base_link 页地面方案 |
| `assets/source/基于基站或者第三方摄像头获取的世界坐标系，具体内容看文档.png` | world/base_link 页基站/相机方案 |
| `assets/source/展示action_end和state_end的图片，说明了action_end和state_end在运动的时候通常会有一定错位.png` | Action/State 示例 |
| `assets/source/dwheel的baselink的定义和我们的定义不一致.png` | DWHEEL Raw End 定义不一致反例 |
| `assets/source/用于讲解tcp_end的图片，说明了tcp_end的一种标定方式为从effector的baselink平移变换得到.png` | TCP End 示例 |

## 5. 维护约束

- 正式页优先使用“真实代码片段 / 数据截图 / 简短表格 / 代码伪实现”。
- 少用数学公式，多用 `@`、`T[:3, :3]`、`T[:3, 3]` 等代码表达。
- 代码注释要短，只解释讲解点，不写成长段说明。
- 避免把内部流程描述成一个正式“平台”。
- 修改页序后同步更新本文件。
