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
    `<#assign Vars.author_id == hash[9]>`,
    `<#assign Vars.author_id == null>`,
    `\${(Vars.author_id)!0}`,
    `\${(hash["key"] > 10)!"默认"}`,
    `<#assign numbers = 1..5>`,
    `<#assign numbers2 = 1..<5>`,
    `<#assign0000 >`,
    `<#else/>`,
    `<#else  />`,
    `<@common.greet "张三" />`,
    `<@common.card title="导入的卡片宏">
      <p>这是通过命名空间调用的块级宏</p>
    </@common.card>`,
    `<dp></p>`,
    `AND costRn/totalCount <= 0.05`,
    `<#if indicator?index != 0>kkk</#if>`,
    `<#if indicator?index !0000 != 0>ll</#if>`,
    `\${goods.name}-\${goods.price > 100}`,
    `\${1 < 2 && 3 > 2}`,
    `\${goods.price > 100 ? "高价" : "平价"}`,
    `SELECT MOD(costRn, IF(num < 50, 1, num / 50)) from sss`,
    `<#if (orderAmount > 0)??>
      AND total_amount > \${orderAmount}
    </#if>;`,
    `p_date >= '\${Vars.startDate}' AND p_date <= '\${Vars.endDate}'`,
    `\${!user.name!"未知姓名"}`,
    `<#macro renderOrder order>
      ll
    </#macro>`,
    `<#assign hobbyList = ["篮球", "音乐"]>`,
    `\${(1 < 2) && (3 > 2)}`,
    `<#ife condition>r</#if>`,
    // `<#else>`,
    `<#ifr condition>f</#ifr>`,
    // `<#iddf condition>`,
    // `\${a ? b ? 1 : 3 : c ? 4 : 5}`,
    // `<#if indicator?index != 0>ffff</#if>`
    // `<#if (goods.price > 100 ? true : false) && goods.stock > 0>有货</#if>`
    `
  AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.025 THEN '0.02-0.025'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.025
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.03 THEN '0.025-0.03'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.03
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.035 THEN '0.03-0.035'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.035
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.04 THEN '0.035-0.04'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.04
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.045 THEN '0.04-0.045'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.045
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.05 THEN '0.045-0.05'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.05
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.055 THEN '0.05-0.055'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.055
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.06 THEN '0.055-0.06'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.06
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.065 THEN '0.06-0.065'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.065
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.07 THEN '0.065-0.07'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.07
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.075 THEN '0.07-0.075'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.075
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.08 THEN '0.075-0.08'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.08
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.085 THEN '0.08-0.085'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.085
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.09 THEN '0.085-0.09'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.09
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.095 THEN '0.09-0.095'
                     AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.09 THEN '0.085-0.09'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.09
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.095 THEN '0.09-0.095'
                     AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.09 THEN '0.085-0.09'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.09
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.095 THEN '0.09-0.095'
                     AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.09 THEN '0.085-0.09'
                    WHEN (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) >= 0.09
                    AND (
                        t1.highQualityMaterialCnt / NULLIF(t1.materialCnt, 0)
                    ) < 0.095 THEN '0.09-0.095'
  `
]
