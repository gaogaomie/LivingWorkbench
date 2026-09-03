import type { MediaItem } from "@daily-life/shared";
import { Button, Card, Form, FormItem, Icon, Input, Select, Tag, Title } from "animal-island-ui";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import {
  mediaCoverDataUrl,
  useMedia,
  useMediaCover,
  useMediaMutations,
} from "@/data-provider/life";
import { notify } from "@/services/notification.service";

const typeOptions = [
  { key: "book", label: "书籍" },
  { key: "movie", label: "电影" },
  { key: "series", label: "剧集" },
  { key: "show", label: "综艺" },
  { key: "anime", label: "动漫" },
  { key: "podcast", label: "播客" },
  { key: "other", label: "其他" },
];
const typeLabels = Object.fromEntries(typeOptions.map((item) => [item.key, item.label]));
const statusOptions = [
  { key: "wishlist", label: "想看 / 想读" },
  { key: "in_progress", label: "进行中" },
  { key: "completed", label: "已完成" },
  { key: "paused", label: "搁置" },
];
const statusLabels = Object.fromEntries(statusOptions.map((item) => [item.key, item.label]));
const ratingOptions = [
  { key: "none", label: "暂不评分" },
  ...[1, 2, 3, 4, 5].map((value) => ({ key: String(value), label: `${value} 分` })),
];

function MediaCoverImage({ assetId, alt }: { assetId: string; alt: string }) {
  const cover = useMediaCover(assetId);
  if (!cover.data) return null;
  return (
    <img
      src={mediaCoverDataUrl(cover.data)}
      alt={alt}
      width={900}
      height={1200}
      loading="lazy"
      decoding="async"
    />
  );
}

export function Component() {
  const today = format(new Date(), "yyyy-MM-dd");
  const year = today.slice(0, 4);
  const [name, setName] = useState("");
  const [type, setType] = useState("book");
  const [status, setStatus] = useState("wishlist");
  const [rating, setRating] = useState("none");
  const [review, setReview] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCoverOnSave, setRemoveCoverOnSave] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const media = useMedia(year);
  const mutations = useMediaMutations(year);
  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const preview = URL.createObjectURL(coverFile);
    setCoverPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [coverFile]);
  const clearEditor = () => {
    setEditing(null);
    setName("");
    setType("book");
    setStatus("wishlist");
    setRating("none");
    setReview("");
    setCoverFile(null);
    setRemoveCoverOnSave(false);
  };
  const visibleItems = useMemo(
    () => (media.data?.items ?? []).filter((item) => filter === "all" || item.status === filter),
    [filter, media.data],
  );

  const submit = async () => {
    if (!name.trim()) {
      notify.error("请填写作品名称。");
      return;
    }
    const values = {
      name: name.trim(),
      type: type as "book" | "movie" | "series" | "show" | "anime" | "podcast" | "other",
      status: status as "wishlist" | "in_progress" | "completed" | "paused",
      rating: rating === "none" ? null : Number(rating),
      recordedOn: editing?.recordedOn ?? today,
      completedOn: status === "completed" ? (editing?.completedOn ?? today) : null,
      review: review.trim() || null,
    };
    const id = editing?.id ?? crypto.randomUUID();
    let recordSaved = false;
    try {
      if (editing) {
        await mutations.edit.mutateAsync({
          ...values,
          id,
          expectedUpdatedAt: editing.updatedAt,
        });
      } else {
        await mutations.create.mutateAsync({ ...values, id });
      }
      recordSaved = true;
      if (coverFile) {
        await mutations.uploadCover.mutateAsync({ id, file: coverFile });
      } else if (editing?.coverAssetId && removeCoverOnSave) {
        await mutations.removeCover.mutateAsync(id);
      }
      clearEditor();
      notify.success(editing ? "作品和封面已更新。" : "作品已收藏。");
    } catch {
      if (recordSaved) {
        clearEditor();
        notify.warning("作品信息已保存，但封面处理失败；可以重新编辑后再试。");
      }
    }
  };

  const beginEdit = (item: MediaItem) => {
    setEditing(item);
    setName(item.name);
    setType(item.type);
    setStatus(item.status);
    setRating(item.rating === null ? "none" : String(item.rating));
    setReview(item.review ?? "");
    setCoverFile(null);
    setRemoveCoverOnSave(false);
  };

  const chooseCover = (file: File) => {
    if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) {
      notify.error("封面仅支持 JPG、PNG 或 WebP 图片。");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error("封面图片不能超过 5 MB。");
      return;
    }
    setCoverFile(file);
    setRemoveCoverOnSave(false);
  };

  const existingEditorCoverId =
    editing?.coverAssetId && !removeCoverOnSave ? editing.coverAssetId : null;
  const hasEditorCover = Boolean(coverPreview || existingEditorCoverId);

  return (
    <section className="grid gap-7">
      <header className="[&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&>p]:m-0 [&>p]:max-w-[680px] [&>p]:text-island-muted">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
          书影音
        </p>
        <h1>收藏陪你走过的作品</h1>
        <p>完成日期决定年度统计；没有封面也可以先把名字和感受留下。</p>
      </header>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <Card
          color="app-teal"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>今年完成</p>
          <strong>{media.data?.summary.completedThisYear ?? "—"}</strong>
        </Card>
        <Card
          color="app-yellow"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>平均评分</p>
          <strong>{media.data?.summary.averageRating ?? "—"}</strong>
        </Card>
        <Card
          color="warm-peach-pink"
          className="relative min-h-[136px] overflow-visible p-6 pr-[118px] sm:min-h-32 sm:pr-[clamp(104px,8vw,128px)] [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>最爱类型</p>
          <strong>
            {media.data?.summary.favoriteType ? typeLabels[media.data.summary.favoriteType] : "—"}
          </strong>
          <img
            className="pointer-events-none absolute bottom-0 right-3 h-auto max-h-[calc(100%+24px)] w-[100px] select-none object-contain object-right-bottom sm:right-2 sm:w-[clamp(88px,7vw,112px)]"
            src="/brand/ip-animals-transparent/G2-golden-shaded-cat-right.png"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
          />
        </Card>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(440px,1.2fr)]">
        <div className="flex flex-col items-start gap-[18px] lg:sticky lg:top-6 lg:self-start">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-yellow">{editing ? "编辑作品" : "收藏作品"}</Title>
          </div>
          <Card className="w-full p-[22px] sm:p-7 [&_h2]:mt-0 [&_.animal-date-picker]:w-full [&_.animal-time-picker]:w-full [&_.animal-select]:w-full">
            <Form layout="vertical" onFinish={submit}>
              <FormItem name="name" label="作品名称">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="书、电影、剧集或播客"
                  allowClear
                />
              </FormItem>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormItem name="type" label="类型">
                  <Select options={typeOptions} value={type} onChange={setType} />
                </FormItem>
                <FormItem name="status" label="状态">
                  <Select options={statusOptions} value={status} onChange={setStatus} />
                </FormItem>
              </div>
              <FormItem name="rating" label="评分">
                <Select options={ratingOptions} value={rating} onChange={setRating} />
              </FormItem>
              <FormItem name="review" label="一句话短评">
                <Input
                  value={review}
                  onChange={(event) => setReview(event.target.value)}
                  allowClear
                />
              </FormItem>
              <FormItem name="cover" label="作品封面">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-[18px] sm:grid-cols-[124px_minmax(0,1fr)]">
                  <div className="aspect-[3/4] w-24 overflow-hidden rounded-[var(--animal-border-radius-lg)] border-[length:var(--animal-border-width)] border-[var(--animal-border-color-light)] bg-[var(--animal-primary-color-bg)] sm:w-[124px] [&_img]:block [&_img]:size-full [&_img]:object-cover">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="待保存的作品封面预览"
                        width={900}
                        height={1200}
                      />
                    ) : existingEditorCoverId ? (
                      <MediaCoverImage assetId={existingEditorCoverId} alt="待保存的作品封面预览" />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-2 font-extrabold text-[var(--animal-text-color-secondary)]">
                        <Icon name="icon-camera" size={34} />
                        <span>可选封面</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2.5 [&_small]:leading-normal [&_small]:text-[var(--animal-text-color-muted)]">
                    <input
                      ref={coverInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) chooseCover(file);
                        event.target.value = "";
                      }}
                    />
                    <Button
                      htmlType="button"
                      type="dashed"
                      icon={<Icon name="icon-camera" size={20} />}
                      onClick={() => coverInput.current?.click()}
                    >
                      {hasEditorCover ? "更换封面" : "选择封面"}
                    </Button>
                    {coverFile ? (
                      <Button htmlType="button" type="text" onClick={() => setCoverFile(null)}>
                        取消新封面
                      </Button>
                    ) : null}
                    {!coverFile && editing?.coverAssetId ? (
                      <Button
                        htmlType="button"
                        type="text"
                        danger={!removeCoverOnSave}
                        onClick={() => setRemoveCoverOnSave((value) => !value)}
                      >
                        {removeCoverOnSave ? "保留原封面" : "保存时移除封面"}
                      </Button>
                    ) : null}
                    <small>支持 JPG、PNG、WebP，最大 5 MB；保存后自动压缩。</small>
                  </div>
                </div>
              </FormItem>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={
                  mutations.create.isPending ||
                  mutations.edit.isPending ||
                  mutations.uploadCover.isPending ||
                  mutations.removeCover.isPending
                }
              >
                {editing ? "保存作品修改" : "保存作品"}
              </Button>
              {editing ? (
                <Button htmlType="button" block onClick={clearEditor}>
                  取消编辑
                </Button>
              ) : null}
            </Form>
          </Card>
        </div>
        <div className="flex w-full flex-col items-start gap-[18px]">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-teal">作品列表</Title>
            <Select
              options={[{ key: "all", label: "全部状态" }, ...statusOptions]}
              value={filter}
              onChange={setFilter}
            />
          </div>
          <Card className="w-full p-[22px] sm:p-7">
            {visibleItems.length === 0 ? (
              <p className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
                这里还没有作品。
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3.5">
              {visibleItems.map((item) => (
                <Card
                  className="grid min-h-0 grid-cols-[96px_minmax(0,1fr)] items-center gap-4 p-[22px] sm:min-h-[188px] sm:grid-cols-[132px_minmax(0,1fr)_auto] sm:gap-6"
                  color={item.status === "completed" ? "app-teal" : "default"}
                  key={item.id}
                >
                  <div className="m-0 aspect-[3/4] w-24 overflow-hidden rounded-[var(--animal-border-radius-lg)] border-[length:var(--animal-border-width)] border-[var(--animal-border-color-light)] bg-[var(--animal-primary-color-bg)] sm:w-[132px] [&_img]:block [&_img]:size-full [&_img]:object-cover">
                    {item.coverAssetId ? (
                      <MediaCoverImage assetId={item.coverAssetId} alt={`${item.name}封面`} />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-2 font-extrabold text-[var(--animal-text-color-secondary)]">
                        <Icon name="icon-critterpedia" size={38} />
                        <span>暂无封面</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 [&_h2]:my-[5px] [&_p]:m-0 [&_p]:leading-relaxed [&_p]:text-[var(--animal-text-color-secondary)] [&_small]:mt-3 [&_small]:block [&_small]:leading-relaxed [&_small]:text-[var(--animal-text-color-secondary)]">
                    <Tag size="small" variant="soft" color="app-teal">
                      {typeLabels[item.type]}
                    </Tag>
                    <h2>{item.name}</h2>
                    <p>
                      {statusLabels[item.status]}
                      {item.rating ? ` · ${item.rating} 分` : ""}
                    </p>
                    {item.review ? <small>{item.review}</small> : null}
                  </div>
                  <div className="col-span-2 flex w-full flex-wrap items-center justify-end gap-2.5 sm:col-span-1 sm:w-auto">
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() =>
                        mutations.update.mutate({
                          id: item.id,
                          status: item.status === "completed" ? "in_progress" : "completed",
                          rating: item.rating,
                          completedOn: item.status === "completed" ? null : today,
                        })
                      }
                    >
                      {item.status === "completed" ? "继续进行" : "标记完成"}
                    </Button>
                    <Button type="default" size="small" onClick={() => beginEdit(item)}>
                      编辑
                    </Button>
                    <DeleteRecordButton
                      source="media"
                      id={item.id}
                      label={item.name}
                      expectedUpdatedAt={item.updatedAt}
                      appearance="button"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
