我想要你重新帮我实现一版freemarker语法的格式化，新的文件名就是format2.ts。
1. @coobee/lezer-freemarker可以提供parser，你可以用这个方法基于我的输入获取我当前代码的语法树
2. 我需要你根据这个语法树自上而下去遍历，并且给这颗树打上标记，你需要有两个标记，一个是缩进indent，一个是空格space【空格分为leftSpace，rightSpace】，代表当前这个节点对应的字符是否需要缩进，是否左右需要加空格。
3. 缩进规则：
- 如果是顶层Document节点，缩进就是0 * unit
- 如果是BlockDirective 或者MacroDirective标签，他的内容DirectiveBody需要缩进，此刻你在这个节点就需要打标缩进一个单位 1* unit。如果有嵌套，里面再继续打标，那么最终哪一行真正的缩进单位就是他的标记，以及所有的祖先节点的加和。
- 如果是Text、Interpolation、Comment、LeafDirective默认不做处理，但是缩进依然要根据祖先节点进行计算得到应该的缩进。
4. 添加空格规则
- 注释：CommentContent两侧需要有空格。leftSpace：spaceUnit、rightSpace：spaceUnit。
- 文本：Text 不做处理
-  指令BlockDirective | LeafDirective | MacroDirective：指令标记的开标签BlockDirectiveStart、LeafDirectiveStart、MacroDirectiveStart右侧需要空格，与别的语法间隔开来。
- 插值Interpolation或者指令内部的运算符：
  - 一元运算符：UnaryOpToken。右侧不需要空格
  - 其他运算符：BinaryOp、AngleOpToken、BinaryOpToken、父节点是BinaryOp的节点，父节点是UnaryOp的节点，两侧都必须加一个空格
  - 三元运算符：BuiltInQuestion 和TernaryColon两侧需要加空格
  - 函数的调用符 BuiltInQuestion：左右都不可以有空格。
  - <#assign user = {"id": 1001, "name": "张三", "address": {"city" : "北京" }}> <#assign hobbyList = [ "篮球", "音乐" ]>对于这种对象来说，括号紧挨着字符那一侧不能有空格，,以及:的左边没有空格，右侧有空格。
  - 加空格的时候要看一下兄弟节点左右是否有空格，确保所有的空格只有一个。
  - 我没有提到的语法默认都不需要加空格，也就是你识别到了就要去掉。
5. 最终你需要遍历这棵树然后重新格式化一下我的输入文本。

特殊处理的部分：
1. 如果是：else或者elseif，你判断他的父节点的如果是BlockDirective，那么就缩进 -1 * unit。
