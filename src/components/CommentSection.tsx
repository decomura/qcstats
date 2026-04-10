"use client";

import { useState } from "react";
import { addComment, deleteComment, type WallComment } from "@/lib/services/wall";
import styles from "./CommentSection.module.css";

interface CommentSectionProps {
  matchId: string;
  comments: WallComment[];
  currentUserId: string | null;
}

export default function CommentSection({
  matchId,
  comments: initialComments,
  currentUserId,
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleComments = showAll ? comments : comments.slice(0, 3);
  const hiddenCount = comments.length - 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const comment = await addComment(matchId, newComment);
    setIsSubmitting(false);

    if (comment) {
      setComments([...comments, comment]);
      setNewComment("");
    }
  };

  const handleDelete = async (commentId: string) => {
    const success = await deleteComment(commentId);
    if (success) {
      setComments(comments.filter((c) => c.id !== commentId));
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "teraz";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className={styles.commentSection}>
      {/* Comment list */}
      {visibleComments.length > 0 && (
        <div className={styles.commentList}>
          {visibleComments.map((c) => (
            <div key={c.id} className={styles.comment}>
              <div className={styles.commentHeader}>
                <span className={styles.commentAuthor}>
                  {c.avatar_url && (
                    <img src={c.avatar_url} alt="" className={styles.commentAvatar} />
                  )}
                  {c.username || "Anonim"}
                </span>
                <span className={styles.commentTime}>{timeAgo(c.created_at)}</span>
                {currentUserId === c.user_id && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(c.id)}
                    title="Usuń komentarz"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className={styles.commentText}>{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Show more */}
      {!showAll && hiddenCount > 0 && (
        <button
          className={styles.showMoreBtn}
          onClick={() => setShowAll(true)}
        >
          Pokaż {hiddenCount} {hiddenCount === 1 ? "komentarz" : hiddenCount < 5 ? "komentarze" : "komentarzy"} więcej...
        </button>
      )}

      {/* New comment form */}
      {currentUserId && (
        <form className={styles.commentForm} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.commentInput}
            placeholder="Dodaj komentarz..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={500}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? "..." : "→"}
          </button>
        </form>
      )}
    </div>
  );
}
