export interface Product{id:string;title:string;description:string;image_url?:string|null;shopee_link:string;price?:string|null;category?:string|null;created_at?:string}
export interface JournalPost{id:string;title:string;content:string;image_url?:string|null;category?:string|null;created_at:string}
export interface Quote{id:string;quote:string;created_at:string}
export interface Drop{id:string;title?:string|null;instagram_url:string;created_at?:string}
export interface InboxEmail{id:string;sender:string;subject:string;body:string;created_at?:string}
