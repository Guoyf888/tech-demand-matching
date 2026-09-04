/**
 * 版本日志更新脚本
 * 用法: node scripts/updateVersionLog.cjs "更新描述1" "更新描述2" ...
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'version_log.json');

function getCurrentVersion() {
  if (!fs.existsSync(LOG_FILE)) return 'v1.0.0';

  const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  if (!Array.isArray(logs) || logs.length === 0) return 'v1.0.0';

  const latestVersion = logs[0].version;
  const match = latestVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 'v1.0.0';

  return latestVersion;
}

function incrementVersion(version) {
  const match = version.match(/v(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 'v1.0.1';

  const major = parseInt(match[1]);
  const minor = parseInt(match[2]);
  const patch = parseInt(match[3]) + 1;

  return `v${major}.${minor}.${patch}`;
}

function updateVersionLog(contents, requestedVersion) {
  let logs = [];

  if (fs.existsSync(LOG_FILE)) {
    try {
      logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
      if (!Array.isArray(logs)) logs = [];
    } catch (e) {
      logs = [];
    }
  }

  const currentVersion = getCurrentVersion();
  const newVersion = requestedVersion || incrementVersion(currentVersion);
  if (!/^v\d+\.\d+\.\d+$/.test(newVersion)) {
    throw new Error(`版本号格式无效: ${newVersion}`);
  }
  if (logs.some((entry) => entry.version === newVersion)) {
    throw new Error(`版本号已存在: ${newVersion}`);
  }

  const now = new Date();
  const updateTime = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');

  const newEntry = {
    version: newVersion,
    update_time: updateTime,
    content: contents
  };

  logs.unshift(newEntry);

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');

  console.log(`✓ 版本日志已更新: ${newVersion}`);
  console.log(`  更新时间: ${updateTime}`);
  console.log(`  更新内容:`);
  contents.forEach((c, i) => console.log(`    ${i + 1}. ${c}`));
}

// 主逻辑
const args = process.argv.slice(2);
const hasExplicitVersion = args[0] === '--version';
const explicitVersion = hasExplicitVersion ? args[1] : undefined;
const contents = hasExplicitVersion ? args.slice(2) : args;

if ((hasExplicitVersion && !explicitVersion) || contents.length === 0) {
  console.log('用法: node scripts/updateVersionLog.cjs [--version v2.2.0] "更新描述1" "更新描述2" ...');
  console.log('示例: node scripts/updateVersionLog.cjs "修复了登录bug" "优化了界面样式"');
  process.exit(1);
}

updateVersionLog(contents, explicitVersion);
