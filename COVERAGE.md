# CONTENT.md 内容覆盖表

新版 Slidev 将原先 24 个正文单元与 6 个附录压缩为 20 页正文/演示和 3 页附录，共 23 页。合并只改变分页，不删除主题。

| CONTENT.md 内容 | 新版 Slidev 页码 |
|---|---:|
| 分享目标、正文边界、时间分配 | 2 |
| 为什么需要末端位姿、完整 Pose 语义 | 3 |
| XYZ 颜色与 Frame | 4 |
| world、base_link、vendor frame | 5 |
| RPY、rotation matrix、quaternion | 6 |
| 末端类型和三组独立语义 | 7 |
| Action/State、Raw/Verify | 8 |
| Reference End、TCP、meshless gripper_center | 9 |
| URDF、Link、Joint、Tree、kinematic chain | 10 |
| left_arm_joint6 的 origin/axis/type/limit | 11 |
| Mesh、STL、visual/collision/inertial、meshless link | 12 |
| URDF joint、运行时 joint、TF transform | 13 |
| 齐次变换与单 joint 变换 | 14 |
| 运动链累积、FK 公式和伪代码 | 15 |
| FK 静态/动态输入、Action/State/TCP、批量 H5 | 16 |
| URDF Tree 与 TF Tree | 17 |
| 公司高层处理、配置与生产流程 | 18 |
| 开发/数据校验和错误清单 | 19 |
| Foxglove 演示要求与四个结论 | 20 |
| Raw frame 归一化、TCP offset、Raw/Verify 误差 | 21 |
| 单帧/批量 FK、术语表 | 22 |
| 已有/待补素材、后续数据、Slidev 实现约束 | 23 |

## 覆盖原则

- 页面正文保留听众独立阅读所需的信息。
- 讲解节奏和少量补充提醒保留在 Slidev speaker notes 中。
- 素材、公式、生产流程和维护约束进入附录，不计入 30 分钟正文。
- `CONTENT.md` 仍是详细内容底稿；`slides.md` 是面向阅读和演示的压缩实现。
