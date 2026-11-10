from django.shortcuts import render
from django.contrib.auth.decorators import login_required
import json
from django.http import JsonResponse
from apps.authentication.models import Post, PostPhoto, PostLike, PostComment # Update imports

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
            'like_count': post.likes.count()  # <-- Updated to match related_name='likes'
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
        
        # <-- Updated to match your model's 'content' field
        comment = PostComment.objects.create(user=request.user, post=post, content=text)
        
        return JsonResponse({
            'success': True,
            'username': comment.user.username,
            'date': comment.created_at.strftime("%B %d, %Y"),
            'text': comment.content,  # <-- Updated field name
            'comment_count': post.comments.count()  # <-- Updated to match related_name='comments'
        })

def home_view(request):
    # Fetch posts and prefetch photos/likes for speed
    posts = Post.objects.all().order_by('-created_at').prefetch_related('photos', 'likes')
    
    # Create a simple list of post IDs the current user has liked
    liked_post_ids = []
    if request.user.is_authenticated:
        # This creates a flat list like: [1, 4, 7]
        liked_post_ids = PostLike.objects.filter(user=request.user).values_list('post_id', flat=True)
            
    return render(request, 'core/home.html', {
        'posts': posts,
        'liked_post_ids': liked_post_ids  # Pass the list to the template
    })

def create_post(request):
    if request.method == 'POST':
        # 1. Security check: Ensure the user is actually logged in
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'message': 'You must be logged in to post.'})

        # 2. Extract the data sent from your home.js fetch request
        frontend_classification = request.POST.get('classification')
        content = request.POST.get('content')
        images = request.FILES.getlist('images') # Grabs the entire array of up to 10 images
        
        # 3. Map frontend dropdown values to your strict ERD choices
        db_mapping = {
            'open': 'Rescue',
            'willing': 'Looking to Adopt'
        }
        actual_post_type = db_mapping.get(frontend_classification, 'Rescue')
        
        try:
            # 4. Create the main Post record (This automatically assigns ownership to the current user)
            new_post = Post.objects.create(
                user=request.user,
                post_type=actual_post_type,
                caption=content
            )
            
            # 5. Loop through the array and save every image to the PostPhoto table
            for image in images:
                PostPhoto.objects.create(
                    post=new_post,
                    image_url=image
                )
                
            return JsonResponse({'success': True, 'message': 'Post and photos successfully saved!'})
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
            
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})