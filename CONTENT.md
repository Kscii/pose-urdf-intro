# URDF、FK 与 End：内容维护稿

> 受众：会写代码，但基本不了解 ROS、URDF、TF 和机器人运动学的数据处理开发人员
> 正式演示：`slides.md`
> 目标时长：40–45 分钟

## 1. 贯穿主线

整套教程始终回答同一个问题：**如何从已有机器人数据计算一条可使用的 End Pose？**

```text
URDF 静态结构 + H5 / rosbag 当前关节值
                    ↓
                   FK
                    ↓
                End Pose
```

- URDF 是基础框架：定义 link、joint、parent/child、origin、axis 和 type。
- 关节值是当前状态：同一套结构在不同 timestamp 下对应不同的 q。
- FK 是数学方法：沿 base→end chain 逐段构造并累积 4×4 变换。
- End Pose 是目标数据：必须明确 link、frame、timestamp、position 和 orientation。

贯穿示例固定为 A2D 左臂：

```text
base_link → … → Link5_l → left_arm_joint6 → Link6_l
          → Link7_l → left_base_link → gripper_center
```

H5 动态输入使用仓库中的索引示例，并通过构型映射对接 A2D joint：

```text
joints/state/arm/position[:, 5]
→ idx18_left_arm_joint6（原始通道名）
→ q6
→ left_arm_joint6（A2D URDF joint）
```

其中 `5` 是零基索引，即 `position` 的第 6 列。

## 2. 统一约定

- `T_A_B` 表示 B frame 在 A frame 下的位姿；变量中的 `base` 是 `base_link` 的简称。
- 变换按 `T_A_C = T_A_B @ T_B_C` 组合。
- revolute / continuous 关节值使用 rad，prismatic 关节值使用 m。
- End 的 position 使用 m，orientation 使用 quaternion `xyzw`。
- `T_origin @ T_motion(q)` 的顺序在所有页面保持一致。
- 本文只详解所选 A2D 代码中出现的字段，不扩展 `dynamics`、`calibration`、`safety_controller` 等可选标签。

## 3. 页序与讲解重点

### 第 1 页：封面与核心数据流

- 直接给出 `URDF + joint q → FK → End Pose`。
- 说明章节顺序与数学数据流统一为 URDF→FK→End。

### 第 2 页：URDF 模块分隔

- 高亮 INPUT。
- URDF 回答“机器人结构是什么”。

### 第 3 页：A2D 完整结构

- 定义 URDF、link 和 joint。
- link 是节点/刚体 frame，joint 是 parent→child 的边。
- 强调 link 不独立声明自己的空间位置，位置由连接它的 joint 决定。

### 第 4 页：Link6_l 与 left_arm_joint6 紧凑骨架

- 左栏加宽，展示包含 `Link5_l`、`Link6_l` 和完整 `left_arm_joint6` 的教学摘录。
- 用小标签说明名称、连接关系和 joint 数值来自 A2D，完整 link 子字段在后续页展开。
- 右栏只建立一层字段地图，不提前展开字段内部结构：
  - Link：简单说明 `inertial / visual / collision` 分别负责物理属性、显示外观和碰撞模型。
  - Joint：简单说明 `origin / parent / child / axis / limit` 分别负责安装位姿、连接方向、运动轴和运动约束。
- 两张卡分别提示第 5–6 页和第 7 页将继续详解，形成“先认识字段，再理解字段内部内容”的过渡。
### 第 5 页：Link inertial 字段

- 使用 `Link6_l` 的真实 `origin / mass / inertia` 数值。
- `inertial/origin` 是质心和惯性参考系相对 link frame 的变换。
- 质量单位 kg，惯性张量单位 kg·m²。

### 第 6 页：Link visual 与 collision 字段

- 逐项解释 `origin / geometry / mesh / material / color`。
- visual 负责显示，collision 负责碰撞检测。
- A2D 当前两者引用同一 STL，但职责不能混淆。

### 第 7 页：left_arm_joint6 完整字段

- 逐项解释 `name / type / origin / parent / child / axis / limit`。
- `axis` 在 joint frame 中表达。
- `lower/upper` 约束位置；revolute 的 effort/velocity 常用 N·m 与 rad/s，prismatic 常用 N 与 m/s；它们不直接进入基础 FK。
- 简要对比 fixed、revolute、continuous、prismatic。

### 第 8 页：XYZ 坐标轴与 RPY（欧拉角）

- 保留红 X、绿 Y、蓝 Z 的可视化约定，强调每个 link/frame 都有自己的局部坐标轴。
- `RPY = Roll–Pitch–Yaw`，是一种欧拉角表示：Roll/横滚绕固定 X，Pitch/俯仰绕固定 Y，Yaw/偏航绕固定 Z。
- URDF 的 `origin rpy="r p y"` 使用弧度 `rad`，并对应 `left_arm_joint6` 的真实值 `-1.5708 0 3.1416`。
- 不展开旋转矩阵推导、万向锁或其他欧拉角顺序。

### 第 9 页：URDF 定义“怎么动”，关节值决定“动了多少”

- `origin/type/axis` 来自静态 URDF。
- `q6` 来自当前 H5/rosbag 帧。
- 本段变换为 `T_origin_6 @ T_motion_6(q6)`。

### 第 10 页：URDF 与 H5 数据会合

- 使用 H5 `arm/position` 关节值矩阵截图展示真实数据，并以 `joints/state/arm/position[t, 5]` 说明索引方式及其到 A2D `left_arm_joint6` 的构型映射。
- URDF 定义“怎么动”，H5 定义“这一帧动了多少”。
- 到此 FK 的两类输入已经齐备。

### 第 11 页：URDF Tree 与右手腕 Chain

- 使用完整 A2D TF Tree 展示 link 之间从 `base_link` 向身体、头部、左右机械臂和夹爪分支的树状结构。
- 使用 `Joint_hand_r` 的真实片段说明 `Link7_r → right_base_link` 的 parent/child 关系。
- 以右手腕最后一个 link `right_base_link` 为目标，从树中取出 `base_link → … → Link7_r → right_base_link` 这条唯一 chain。

### 第 12 页：FK 模块分隔

- 高亮 METHOD。
- 回顾输入是 URDF chain 与 joint values，输出是 End Pose。

### 第 13 页：机器人运动学

- 区分关节空间与笛卡尔空间。
- FK：joint values→End Pose；IK 只做对比，不展开。

### 第 14 页：4×4 齐次变换

- 左上 3×3 是旋转，右侧 3×1 是位置。
- 明确定义 `T_A_B`，强调矩阵乘法顺序。

### 第 15 页：DH 与 URDF

- 两者都把每段结构变成 4×4 矩阵再连乘。
- DH 只用于建立直觉；A2D 主线继续直接解析 URDF。

### 第 16 页：left_arm_joint6 的 motion

- 从 H5 取得 `q6`。
- 从 URDF 取得 origin、axis 与 type。
- 生成 `T_Link5_l_Link6_l = T_origin_6 @ T_motion_6`。
- fixed/revolute/prismatic 只在 `T_motion` 的构造方式上不同。

### 第 17 页：FK Tree

- 从 `base_link` 沿唯一 parent→child 路径走到 `gripper_center`。
- 结果记为 `T_base_gripper_center`，其中 `base` 指 `base_link`。

### 第 18 页：FK 算法

- 从单位矩阵开始。
- 为每个 joint 生成 `T_parent_child`。
- 按顺序执行 `T_base_current @ T_parent_child`。
- 返回最终 `T_base_end`。

### 第 19 页：矩阵转 position 与 orientation

- FK 返回 `T_base_gripper_center`。
- position 取 `T[:3, 3]`。
- orientation 取 `T[:3, :3]` 后转换为 quaternion `xyzw`。
- chain 已确定起点 `base_link` 与终点 `gripper_center`，输入来自当前 `joint_values[t]`。
- 此时只有几何结果；reference link/frame、timestamp 和 Raw/Verify/TCP 分类留到 End 模块显式组织。
- 版式上左侧保留完整计算代码，右侧将“已确定的几何结果”和“仍待补齐的数据语义”分成两张卡；模块交接横跨页面底部。

### 第 20 页：End 模块分隔

- 高亮 OUTPUT。
- 承接上一模块的 position/orientation，再补齐 reference link/frame、timestamp 和业务类型。

### 第 21 页：End Pose 数据契约

- 固定讲解 `reference_link / reference_frame / timestamp / position / orientation`。
- Quaternion、Rotation Matrix、RPY 表达同一个朝向；RPY 在 URDF 模块已经解释，此处用于回顾三种表示的关系。
- H5 orientation 使用 `xyzw`。

### 第 22 页：base_link 与 world

- 手臂 FK 默认先得到相对 `base_link` 的 End Pose。
- world 是外部参考系，需要额外的 `world→base_link` 来源。

### 第 23 页：DWHEEL Raw End 反例

- 厂商 Raw End 可能不以统一 `base_link` 表达。
- 数值比较前先对齐 frame、endpoint 和姿态约定。

### 第 24 页：Action/State/Raw/Verify/TCP

- Action/State 描述时间或数据语义，Raw/Verify 描述来源，TCP 描述 endpoint。
- Verify End 已在上一模块由 URDF、joint values 和 FK 计算。

### 第 25 页：TCP End

- `T_base_tcp = T_base_reference @ T_reference_tcp`，其中 reference end 来自上一模块的 FK。
- TCP 误差可能包含安装、几何和标定误差。
- 收束：为 FK 几何结果补齐 link、frame、timestamp 和 endpoint 语义。

### 第 26 页：完整逻辑链总结

- URDF 是基础框架。
- 关节角是当前状态。
- FK 是数学工具。
- End Pose 是目标数据。
- 结尾统一复述：从 URDF 取结构、从 H5 取当前关节角，用 FK 计算指定 frame 下的 End Pose。

## 4. 建议时间分配

| 部分 | 时间 |
|---|---:|
| 封面与主问题 | 1–2 分钟 |
| URDF 模块 | 14–16 分钟 |
| FK 模块 | 13–15 分钟 |
| End 模块 | 10–12 分钟 |
| 总结与提问 | 2 分钟 |

## 5. 素材与维护约束

- `A2D.urdf`：Link6_l、left_arm_joint6 和 gripper_center 真实代码来源。
- `资料文档.md`：H5 joint mapping 与 End 数据约定来源。
- `assets/source/`：A2D frame、TF、End、world、DWHEEL、Action/State、TCP 图片。
- 正式页优先使用真实代码、真实映射、已有截图和简短表格。
- 修改符号时同时检查 `T_A_B` 定义、矩阵顺序、单位和 quaternion 顺序。
- 修改页序或字段含义后同步更新本文件。
- 基础 FK 不展开动力学、控制器、IK 求解、轨迹优化或 URDF 未使用的可选标签。
