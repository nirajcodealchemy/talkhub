begin;

alter table public.messages
  add column if not exists sticker_url text;

alter table public.messages
  drop constraint if exists messages_content_or_attachment;

alter table public.messages
  add constraint messages_content_or_attachment
  check (
    nullif(trim(content), '') is not null
    or attachment_path is not null
    or sticker_url is not null
  );

commit;
