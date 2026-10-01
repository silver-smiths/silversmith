// Static hosting entry: reuse the canonical document, preserving path/query/OAuth hash.
(async () => {
  try {
    const response = await fetch('/merokdam/admin/index.html', {cache:'no-cache'});
    if (!response.ok) throw new Error(String(response.status));
    const html = await response.text();
    if (!html.includes('id="tabs"')) throw new Error('invalid console document');
    document.open(); document.write(html); document.close();
  } catch (error) {
    document.getElementById('status').textContent = '운영 콘솔을 불러오지 못했습니다. 인터넷 연결을 확인한 후 새로고침해 주세요.';
  }
})();
