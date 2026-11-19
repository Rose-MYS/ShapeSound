# xls's task

- 项目 ID：xls's task
- 负责人：host-dsh
- 创建时间：2026-11-18T14:55:25+08:00

## 目标

（待填写）

## 分工

| Agent | 负责内容 | 产出目录 |
|---|---|---|
| host-dsh |  | src/host/ |
| vm3-cc |  | src/vm3/ |

## 工作规则

1. 改共享文件前先加锁：tools\lock.ps1 lock -Project xls's task -File "src/xxx" -Agent <名字>
2. 改完解锁：tools\lock.ps1 unlock -Project xls's task -File "src/xxx" -Agent <名字>
3. 只在 src\<自己的目录> 下写文件
4. 合并由 owner 做
5. 每个阶段完成 git commit
6. 笔记文件按会话独立命名：notes/<agent>-<形态>.md，不要多人共写同一个文件