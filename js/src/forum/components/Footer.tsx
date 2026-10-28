import Component from 'flarum/common/Component';
import type Mithril from 'mithril';

export default class Footer extends Component {
  oncreate(vnode: Mithril.Vnode) {
    super.oncreate(vnode);

    const serverStart = new Date('2021-12-08T00:00:00');
    const communityStart = new Date('2025-10-29T00:00:00');
    const siteStart = new Date('2023-09-29T00:00:00');
    const now = new Date();
    
    const daysSince = (d: Date) => {
      const ms = now.getTime() - d.getTime();
      if (ms < 0) return 0;
      return Math.floor(ms / 86400000) + 1;
    };

    const s = document.getElementById('tcsServerDays');
    const c = document.getElementById('tcsCommunityDays');
    const t = document.getElementById('tcsSiteDays');
    
    if (s) s.textContent = `TcsCraft 已开服 ${daysSince(serverStart)} 天`;
    if (t) t.textContent = `官网已运行 ${daysSince(siteStart)} 天`;
    if (c) c.textContent = `社区已运行 ${daysSince(communityStart)} 天`;
  }

  view() {
    return (
      <footer id="footer" className="App-footer" style={{ backgroundColor: 'var(--body-bg-shaded)', color: 'var(--muted-color)', padding: '36px 0 22px 0' }}>
        <div className="ThemeBaseFooter-container container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px' }}>
          <div className="ThemeBaseFooter-upper" style={{ textAlign: 'center' }}>
            <h2 className="ThemeBaseFooter-title" style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 600, color: 'var(--text-color, #333)', letterSpacing: '0.5px' }}>
              TcsCraft 玩家社区
            </h2>
            <p className="ThemeBaseFooter-logo-description" style={{ margin: '0 auto', maxWidth: '720px', lineHeight: 1.8, fontSize: '14px' }}>
              为 TcsCraft 玩家打造的交流社区。本站提供服务器资讯、玩家交流、资源分享与活动公告。
            </p>
          </div>
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', lineHeight: 1.9 }}>
            <p style={{ margin: 0 }}>
              <a href="https://bbs.tcscraft.com/" target="_blank" style={{ textDecoration: 'none', color: 'inherit' }}>©2026 TcsCraft.com 版权所有</a>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
              <a href="https://beian.miit.gov.cn" target="_blank" style={{ textDecoration: 'none', color: 'inherit' }}>豫ICP备2023029922号</a>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
              <a href="https://beian.mps.gov.cn/#/query/webSearch?code=41172102000238" target="_blank" rel="noopener" style={{ textDecoration: 'none', color: 'inherit' }}>豫公网安备41172102000238号</a>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
              本站仅限中国大陆及港澳台地区访问
            </p>
            <p style={{ margin: '6px 0 0' }}>
              <span id="tcsServerDays">TcsCraft 已开服计算中...</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
              <span id="tcsSiteDays">官网已运行计算中...</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
              <span id="tcsCommunityDays">社区已运行计算中...</span>
            </p>
          </div>
        </div>
      </footer>
    );
  }
}