from django.shortcuts import render
from django.contrib.auth.decorators import login_required
import json
from django.http import JsonResponse
from apps.authentication.models import Post, PostPhoto, PostLike, PostComment

def toggle_like(request, post_id):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'message': 'Log in to like posts.'})
            
        post = Post.objects.get(id=post_id)
        
        # Check if the user already liked this post
        like_exists = PostLike.objects.filter(user=request.user, post=post).first()
        
        if like_exists:
            like_exists.delete()
            liked = False
        else:
            PostLike.objects.create(user=request.user, post=post)
            liked = True
            
        return JsonResponse({
            'success': True, 
            'liked': liked, 
            'like_count': post.likes.count()
        })
        
def add_comment(request, post_id):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'message': 'Log in to comment.'})
            
        data = json.loads(request.body)
        text = data.get('comment_text')
        
        if not text:
            return JsonResponse({'success': False, 'message': 'Comment cannot be empty.'})
            
        post = Post.objects.get(id=post_id)
        
        comment = PostComment.objects.create(user=request.user, post=post, content=text)
        
        return JsonResponse({
            'success': True,
            'username': comment.user.username,
            'date': comment.created_at.strftime("%B %d, %Y"),
            'text': comment.content,
            'comment_count': post.comments.count(),
            'avatar_url': request.user.profile.avatar_url  # Sends the dynamic profile avatar back to JS
        })

def home_view(request):
    # Optimized with select_related('user__profile') to prevent N+1 query lag when loading avatars
    posts = Post.objects.select_related('user__profile').prefetch_related('photos', 'likes').order_by('-created_at')
    
    liked_post_ids = []
    if request.user.is_authenticated:
        liked_post_ids = PostLike.objects.filter(user=request.user).values_list('post_id', flat=True)
            
    return render(request, 'core/home.html', {
        'posts': posts,
        'liked_post_ids': liked_post_ids
    })

def create_post(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'message': 'You must be logged in to post.'})

        post_classification = request.POST.get('classification')
        content = request.POST.get('content')
        images = request.FILES.getlist('images')
        
        try:
            # Creates the main post record using direct classification values ('Rescue' or 'Looking to Adopt')
            new_post = Post.objects.create(
                user=request.user,
                post_type=post_classification,
                caption=content
            )
            
            for image in images:
                PostPhoto.objects.create(
                    post=new_post,
                    image_url=image
                )
                
            return JsonResponse({'success': True, 'message': 'Post and photos successfully saved!'})
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
            
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})