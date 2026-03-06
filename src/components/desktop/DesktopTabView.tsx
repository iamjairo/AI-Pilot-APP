/**
 * @file Desktop tab view — renders DesktopViewer in a full tab.
 *
 * Reads wsPort and vncPassword from the desktop store using the tab's
 * projectPath, so the same postMessage credential flow is used as in
 * the context panel viewer.
 */
import { useTabStore } from '../../stores/tab-store';
import { useDesktopStore } from '../../stores/desktop-store';
import DesktopViewer from './DesktopViewer';

export default function DesktopTabView() {
  const activeTab = useTabStore(s => s.tabs.find(t => t.id === s.activeTabId));
  const projectPath = activeTab?.projectPath;
  const desktopState = useDesktopStore(s =>
    projectPath ? s.stateByProject[projectPath] : undefined,
  );

  if (!activeTab || activeTab.type !== 'desktop' || !projectPath) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        No desktop session
      </div>
    );
  }

  if (!desktopState || desktopState.status !== 'running' || !desktopState.wsPort || !desktopState.vncPassword) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        {desktopState?.status === 'starting' ? 'Starting desktop…' : 'Desktop is not running'}
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 min-h-0">
      <DesktopViewer wsPort={desktopState.wsPort} vncPassword={desktopState.vncPassword} />
    </div>
  );
}
