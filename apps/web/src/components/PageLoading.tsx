import { Loading } from "animal-island-ui";

export function PageLoading() {
  return (
    <div className="fixed inset-0" role="status" aria-label="页面加载中，请稍候">
      <Loading />
      <span className="sr-only">页面加载中，请稍候</span>
    </div>
  );
}
