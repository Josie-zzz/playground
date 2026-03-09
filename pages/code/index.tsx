import { useState, type ReactNode } from 'react';
import CodeEditor from '@/components/CodeEditor';

const languageCase = {
  'sql': `SELECT
    id,
    cost,
    1 AS tag,
    costRn,
    COUNT(1) OVER () AS num
FROM all_adv`,
  'json': `{
  "name": "张三",
  "age": 30,
  "city": "北京"
}`,
  'freemarker': [
  `<#if Vars.type == "'advIds'">
        id > 0
  <#elseif Vars.type == "'customerIds'">
          id > 0
  <#elseif Vars.type == "'customerNames'">
          (id IS NOT NULL AND id != '')
  </#if>`,
  '<@common.greet "张三" />',
  `<@common.card title="导入的卡片宏">ll
    </@common.card>`,
  '<dp></p>',
  'AND costRn/totalCount <= 0.05',
  '<#if indicator?index != 0>kkk</#if>',
  '<#if indicator?index !0000 != 0>ll</#if>',
].join('\n'),
  'fm-sql': [
  `SELECT
/*+ SET_VAR(query_timeout=8,enable_sql_cache = true,execute_group=NORMAL, extract_redundant_predicates=true ) */
        id,
        cost,
        1 AS tag,
        costRn,
        COUNT(1) OVER () AS num
    FROM all_adv
    WHERE
        <#if Vars.type == "'advIds'">
             id > 0
        <#elseif Vars.type == "'customerIds'">
                id > 0
        <#elseif Vars.type == "'customerNames'">
               (id IS NOT NULL AND id != '')
        </#if>
        <#if Vars.benchLevelEnd??>
        AND costRn/totalCount <= \${Vars.benchLevelEnd}
        </#if>
        <#if Vars.benchLevelStart??>
        AND costRn/totalCount >= \${Vars.benchLevelStart}
        </#if>
        <#if Vars.benchmarkLevel?? && Vars.benchmarkLevel == "'top5%'">
        AND costRn/totalCount <= 0.05
        <#elseif Vars.benchmarkLevel?? && Vars.benchmarkLevel == "'top10%'">
        AND costRn/totalCount <= 0.1
        <#elseif Vars.benchmarkLevel?? && Vars.benchmarkLevel == "'top20%'">
        AND costRn/totalCount <= 0.2
        </#if>
        `,
  '<#else  />',
  '<@common.greet "张三" />',
  `<@common.card title="导入的卡片宏">ll
    </@common.card>`,
  '<dp></p>',
  'AND costRn/totalCount <= 0.05',
  '<#if indicator?index != 0>kkk</#if>',
  '<#if indicator?index !0000 != 0>ll</#if>',
].join('\n'),
}

const CodePlaygroundPage = (): ReactNode => {
  const language = 'sql';
  const useFreeMarker = true
  const [code, setCode] = useState<string>(useFreeMarker ? languageCase['fm-sql'] : languageCase[language]);
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <CodeEditor
        language={language}
        value={code}
        onChange={setCode}
        defaultValue=""
        languageConfig={{
          useFreeMarker,
          completion: {
            func: [
              {
                key: 'sum',
                label: 'sum(xxx)',
                detail: '求和函数',
              },
              {
                key: 'add',
                label: 'add(xxx, yyy)',
                detail: '加法函数',
              },
            ],
            variable: [
              {
                startTag: '[',
                endTag: ']',
                allowEdit: false,
                highlightStyle: {
                  contentStyle: [
                    { color: '#13b3cf' },
                    { color: '#1c3cdb' },
                    { color: '#c81cdb' },
                  ],
                  tagStyle: { color: '#d6d260' },
                  separator: '.',
                  separatorStyle: { color: '#db591c' },
                },
                options: [
                  {
                    key: '[dataset1.data66.data9999]',
                    label: '数据集1',
                  },
                  {
                    key: '[dataset2.kkkk]',
                    label: '数据集2',
                  },
                  {
                    key: '[dataset3.nihao.hhhh.xxx]',
                    label: '数据集3',
                  },
                ],
              },
              {
                startTag: '${',
                endTag: '}',
                trigger: '$',
                highlightStyle: {
                  contentStyle: [{ color: '#db751c' }],
                },
                noMerge: true,
                options: [
                  {
                    key: '${date}',
                    label: '日期函数',
                  },
                  {
                    key: '${time}',
                    label: '时间函数',
                  },
                  {
                    key: '${department}',
                    label: '部门',
                  },
                ],
              },
            ],
          },
        }}
      />
    </div>
  );
};

export default CodePlaygroundPage;
