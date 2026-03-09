export const cases = [
  `<#if DSL.GroupBy??>
        GROUP BY
        <#list DSL.GroupBy > 9>
            <#if !group?is_first>,</#if>
            \${group}
        </#list>
    </#if>`,
  `select
        \${DSL.Indicators?join(",")}
    from lll
    where \${WhereString}
    <#if Vars.author_id == 1000>
        AND author_id = 1000
    <#else>
      xxxxx
    </#if>
    <#if Vars.roi2_white_list_date??>
        AND roi2_white_list_date is not null
    </#if>
    <#if DSL.GroupBy??>
        GROUP BY
        <#list DSL.GroupBy as group>
            <#if !group?is_first>,</#if>
            \${group}
        </#list>
    </#if>
    order by \${OrderBy}
    limit \${Offset},\${Limit}`,
  `<#-- 案例2：循环与集合操作（不超过50行） -->
    <#-- 1. 定义集合/Map 变量 -->
    <#assign numList = [1, 2, 3, 4, 5]>
    <#assign userMap = {"id": 1001, "name": "王五", "phone": "13800138000"}>

    <#-- 2. 遍历列表集合 -->
    <h3>数字列表（偶数标注）</h3>
    <#list numList as num>
      数字：\${num} 
      <#if num % 2 == 0>偶数</#if>
    </#list>

    <#-- 3. 遍历Map键值对 -->
    <h3>用户Map信息</h3>
    <#list userMap?keys as key>
      \${key}：\${userMap[key]}<br>
    </#list>`,
  `<#if age >= 18>
      成年
    <#elseif age > 12>
      青少年
    <#else>
      儿童
    </#if>`,
  `<#if a > b> kk </#if>`,
  `<#if !group?is_first>ok</#if>`,
  `<#if x?int(2) > 1>ok</#if>`,
  `limit \${Offset!0},\${Limit!100}`,
  `limit \${Offset},\${Limit!"我是猪头"}`,
  `<#assign Vars.author_id == true>`,
  `<#assign Vars.author_id == hash["key"]>`,
];
