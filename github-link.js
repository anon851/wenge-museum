(() => {
  // 把要公开显示的 GitHub 地址填进双引号，留空则隐藏链接。
  const githubAddress = "https://github.com/anon851/wenge-museum";
  if (!githubAddress.trim()) return;

  let url;
  try {
    url = new URL(githubAddress);
  } catch {
    return;
  }
  if (url.origin !== 'https://github.com' || url.username || url.password) return;

  const row = document.getElementById('intro-github');
  const link = row.querySelector('a');
  link.href = url.href;
  link.textContent = url.href;
  row.hidden = false;
})();
