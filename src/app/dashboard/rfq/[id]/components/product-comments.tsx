"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import type { ProductComment, User } from './types';
import type { SupportedLanguage } from '@/lib/gemini';

interface ProductCommentsProps {
    productId: string;
    comments: ProductComment[];
    currentUser: User | null;
    onAddComment: (productId: string, content: string) => Promise<void>;
    t: (key: string, params?: any) => string;
}

const formatDate = (dateStr: string): string => {
    try { return new Date(dateStr).toLocaleString(); } catch { return dateStr; }
};

const roleColors: Record<string, string> = {
    'Sales': 'bg-blue-100 text-blue-700',
    'Purchasing': 'bg-green-100 text-green-700',
    'Admin': 'bg-purple-100 text-purple-700',
};

export function ProductComments({ productId, comments, currentUser, onAddComment, t }: ProductCommentsProps) {
    const { language } = useI18n();
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim() || submitting) return;
        setSubmitting(true);
        try {
            await onAddComment(productId, content.trim());
            setContent('');
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
    };

    return (
        <div className="mt-4 space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
                💬 {t('product_comments')}
                {comments.length > 0 && (
                    <span className="text-xs text-muted-foreground font-normal">({comments.length})</span>
                )}
            </h4>

            {comments.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {comments.map((comment) => {
                        // 读取当前语言对应的译文，原文语言相同则不显示译文
                        const translation = comment.translations?.[language as SupportedLanguage];
                        const isOriginalLanguage = comment.originalLanguage === language;
                        const showTranslation = !isOriginalLanguage && !!translation;

                        return (
                            <div
                                key={comment.id}
                                className={`flex gap-3 p-3 rounded-lg ${comment.authorId === currentUser?.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-muted/50'}`}
                            >
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarFallback className="text-xs">{comment.authorName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm">{comment.authorName}</span>
                                        <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${roleColors[comment.authorRole] || ''}`}>
                                            {comment.authorRole}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {formatDate(comment.createdAt)}
                                        </span>
                                    </div>
                                    {/* 原文 */}
                                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                                        {comment.content}
                                    </p>
                                    {/* 译文（灰色小字，高亮背景） */}
                                    {showTranslation && (
                                        <p className="text-xs text-muted-foreground italic mt-1.5 bg-muted/60 rounded px-2 py-1">
                                            {translation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{t('no_comments_yet')}</p>
            )}

            {currentUser && (
                <div className="flex gap-2 items-end">
                    <Textarea
                        placeholder={t('comment_placeholder')}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[60px] resize-none flex-1 text-sm"
                        rows={2}
                    />
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!content.trim() || submitting}
                        className="flex-shrink-0"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            )}
            <p className="text-xs text-muted-foreground">{t('comment_hint')}</p>
        </div>
    );
}