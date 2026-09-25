export interface Product{id:string;title:string;description:string;image_url?:string|null;shopee_link:string;price?:string|null;category?:string|null;created_at?:string;is_new?:boolean;is_featured?:boolean;is_most_purchased?:boolean;is_most_viewed?:boolean;companion_journal_id?:string|null}
export interface JournalPost{id:string;title:string;content:string;image_url?:string|null;category?:string|null;papo_filter?:string|null;created_at:string;is_new?:boolean;is_featured?:boolean;is_most_purchased?:boolean;is_most_viewed?:boolean;filter_category?:string|null}
export interface Quote{id:string;quote:string;created_at:string}
export interface Drop{id:string;title?:string|null;instagram_url:string;created_at?:string}
export interface InboxEmail{id:string;sender:string;subject:string;body:string;created_at?:string}
export interface JournalComment{id:string;journal_id:string;email?:string;body:string;status:"pending"|"approved"|"rejected";source_path?:string|null;created_at:string;approved_at?:string|null;moderated_at?:string|null;journal?:{title?:string|null;category?:string|null}|{title?:string|null;category?:string|null}[]|null}
