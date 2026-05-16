// 创建右键菜单
browser.contextMenus.create({
  id: "explain-text",
  title: "解释",
  contexts: ["selection"]
});

// 点击菜单触发
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "explain-text") {
    const selectedText = info.selectionText;

    try {
      // 先在页面注入一个 loading 弹窗，告诉用户正在等待 LLM 回复
      await browser.tabs.executeScript(tab.id, {
        code: `
        (function() {
          const old = document.getElementById("llm-popup");
          if (old) old.remove();

          const div = document.createElement("div");
          div.id = "llm-popup";

          // 内容容器，方便后续只替换内容而不移除关闭按钮
          const content = document.createElement('div');
          content.className = 'llm-popup-content';
          content.innerText = '正在生成，请稍候...';

          Object.assign(div.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            maxWidth: "400px",
            maxHeight: "300px",
            overflow: "auto",
            padding: "12px",
            background: "#1e1e1e",
            color: "#fff",
            fontSize: "14px",
            lineHeight: "1.5",
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            zIndex: 999999,
            whiteSpace: "pre-wrap"
          });

          // 关闭按钮
          const close = document.createElement("div");
          close.innerText = "✕";
          Object.assign(close.style, {
            position: "absolute",
            top: "6px",
            right: "10px",
            cursor: "pointer",
            fontSize: "14px",
            color: "#aaa"
          });

          close.onclick = () => div.remove();

          div.appendChild(close);
          div.appendChild(content);
          document.body.appendChild(div);
        })();
      `
      });

      const result = await callLLM(selectedText);

      // 收到结果后只更新内容，不移除整个弹窗（保留关闭按钮）
      await browser.tabs.executeScript(tab.id, {
        code: `
        (function() {
          const div = document.getElementById('llm-popup');
          if (!div) return;
          let content = div.querySelector('.llm-popup-content');
          if (!content) {
            content = document.createElement('div');
            content.className = 'llm-popup-content';
            div.appendChild(content);
          }
          content.innerText = ${JSON.stringify(result)};
        })();
      `
      });
    } catch (err) {
      // 如果发生错误，优先尝试把错误信息写入弹窗内容，否则回退到 alert
      try {
        await browser.tabs.executeScript(tab.id, {
          code: `
          (function() {
            const div = document.getElementById('llm-popup');
            if (!div) {
              alert('出错了: ' + ${JSON.stringify(err.message)});
              return;
            }
            let content = div.querySelector('.llm-popup-content');
            if (!content) {
              content = document.createElement('div');
              content.className = 'llm-popup-content';
              div.appendChild(content);
            }
            content.innerText = '出错了: ' + ${JSON.stringify(err.message)};
          })();
        `
        });
      } catch (e) {
        // 如果注入失败（页面受限等），退回到 alert
        browser.tabs.executeScript(tab.id, {
          code: `alert("出错了: ${err.message}")`
        });
      }
    }
  }
});

// 调用 LLM API
async function callLLM(text) {

  const response = await fetch("Your_host_address/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-EXTENSION-TOKEN": "your-secret" 
        },
        body: JSON.stringify({
          text: text
        })
      });

      const data = await response.json();

  return data.choices[0].message.content;
}