import { execFileSync } from 'node:child_process';

let history;
try {
  history = execFileSync('git', ['log', '--all', 'HEAD', '-z', '--format=%h%x00%ae%x00%ce%x00%B'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch {
  console.error('请从已有至少一次提交的 Git 仓库运行发布检查。');
  process.exit(1);
}

const fields = history.split('\0');
const noreply = /^(?:\d+\+)?[A-Za-z0-9][A-Za-z0-9-]*@users\.noreply\.github\.com$/i;
const trailer = /^(?:Co-Authored-By|[A-Za-z-]*Session)\s*:/i;
let failed = false;
for (let i = 0; i + 3 < fields.length; i += 4) {
  const [commit, author, committer, message] = fields.slice(i, i + 4);
  if (!noreply.test(author) || !noreply.test(committer)) {
    console.error(`${commit} 的作者或提交者邮箱需要改为 GitHub noreply 地址。`);
    failed = true;
  }
  if (message.split('\n').some(line => trailer.test(line))) {
    console.error(`${commit} 的提交正文含共同作者或会话标记。`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else console.log('提交历史通过发布身份检查。');
