'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageCircle, Send, ThumbsUp, ThumbsDown, Reply, MoreHorizontal } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Comment {
  id: string
  vacancyId: string
  userId: string
  userName: string
  userEmail: string
  content: string
  parentId?: string
  likes: number
  dislikes: number
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

interface CommentsSectionProps {
  vacancyId: string
}

export function CommentsSection({ vacancyId }: CommentsSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  // Загрузка комментариев
  const loadComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/comments?vacancyId=${vacancyId}`)
      const data = await response.json()

      if (response.ok) {
        setComments(data.comments || [])
      } else {
        setError(data.error || 'Ошибка загрузки комментариев')
      }
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error)
      setError('Ошибка загрузки комментариев')
    } finally {
      setLoading(false)
    }
  }

  // Отправка комментария
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !newComment.trim()) return

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id || 'test-user-123'
        },
        body: JSON.stringify({
          vacancyId,
          content: newComment.trim(),
          parentId: replyingTo
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewComment('')
        setReplyingTo(null)
        setReplyContent('')
        loadComments() // Перезагружаем комментарии
      } else {
        setError(data.error || 'Ошибка отправки комментария')
      }
    } catch (error) {
      console.error('Ошибка отправки комментария:', error)
      setError('Ошибка отправки комментария')
    }
  }

  // Отправка ответа
  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id || 'test-user-123'
        },
        body: JSON.stringify({
          vacancyId,
          content: replyContent.trim(),
          parentId
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setReplyContent('')
        setReplyingTo(null)
        loadComments() // Перезагружаем комментарии
      } else {
        setError(data.error || 'Ошибка отправки ответа')
      }
    } catch (error) {
      console.error('Ошибка отправки ответа:', error)
      setError('Ошибка отправки ответа')
    }
  }

  // Лайк/дизлайк комментария
  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user) return

    try {
      const response = await fetch(`/api/comments/${commentId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id || 'test-user-123'
        },
        body: JSON.stringify({ type }),
      })

      if (response.ok) {
        loadComments() // Перезагружаем комментарии
      }
    } catch (error) {
      console.error('Ошибка реакции на комментарий:', error)
    }
  }

  // Группировка комментариев по родительским
  const groupComments = (comments: Comment[]) => {
    const parentComments = comments.filter(comment => !comment.parentId)
    const replies = comments.filter(comment => comment.parentId)
    
    return parentComments.map(parent => ({
      ...parent,
      replies: replies.filter(reply => reply.parentId === parent.id)
    }))
  }

  useEffect(() => {
    loadComments()
  }, [vacancyId])

  const groupedComments = groupComments(comments)

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Комментарии ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Форма добавления комментария */}
        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || ''} />
                <AvatarFallback>
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder={replyingTo ? "Напишите ответ..." : "Напишите комментарий..."}
                  value={replyingTo ? replyContent : newComment}
                  onChange={(e) => replyingTo ? setReplyContent(e.target.value) : setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="text-sm text-gray-500">
                    {replyingTo && 'Отвечаете на комментарий'}
                  </div>
                  <div className="flex gap-2">
                    {replyingTo && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent('')
                        }}
                      >
                        Отмена
                      </Button>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={replyingTo ? !replyContent.trim() : !newComment.trim()}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {replyingTo ? 'Ответить' : 'Отправить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Войдите в систему, чтобы оставить комментарий</p>
          </div>
        )}

        {/* Список комментариев */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                  <div className="h-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Пока нет комментариев. Будьте первым!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedComments.map((comment) => (
              <div key={comment.id} className="space-y-4">
                {/* Основной комментарий */}
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {comment.userName?.charAt(0) || comment.userEmail?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.userName || comment.userEmail}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {new Date(comment.createdAt).toLocaleDateString('ru-RU')}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(comment.id)}
                        >
                          <Reply className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-gray-700 text-sm mb-3">{comment.content}</p>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(comment.id, 'like')}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {comment.likes}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(comment.id, 'dislike')}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          {comment.dislikes}
                        </Button>
                      </div>
                    </div>

                    {/* Ответы */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-6 mt-4 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src="" />
                              <AvatarFallback className="text-xs">
                                {reply.userName?.charAt(0) || reply.userEmail?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-xs">
                                      {reply.userName || reply.userEmail}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {new Date(reply.createdAt).toLocaleDateString('ru-RU')}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-gray-700 text-xs mb-2">{reply.content}</p>
                                <div className="flex items-center gap-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReaction(reply.id, 'like')}
                                    className="text-gray-500 hover:text-blue-600 text-xs"
                                  >
                                    <ThumbsUp className="h-3 w-3 mr-1" />
                                    {reply.likes}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReaction(reply.id, 'dislike')}
                                    className="text-gray-500 hover:text-red-600 text-xs"
                                  >
                                    <ThumbsDown className="h-3 w-3 mr-1" />
                                    {reply.dislikes}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
