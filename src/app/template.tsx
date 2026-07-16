/**
 * layoutと違い、ルート遷移のたびに新しいインスタンスとしてマウントされるため、
 * CSSアニメーション(page-fade-in)を毎回再トリガーできる。JS側のアニメーション処理は行わない。
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-fade-in flex flex-1 flex-col">{children}</div>;
}
