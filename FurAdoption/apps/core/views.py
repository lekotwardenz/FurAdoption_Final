from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
import json
from django.http import JsonResponse
from apps.authentication.models import Post, PostPhoto, PostLike, PostComment, Profile
from apps.authentication.forms import ProfileEditForm

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
            'avatar_url': request.user.profile.avatar_url  
        })

def home_view(request):
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

def profile_view(request, username):
    profile_user = get_object_or_404(User, username=username)
    posts_count = profile_user.posts.count()
    is_own_profile = request.user.is_authenticated and request.user == profile_user
    
    return render(request, 'core/profile.html', {
        'profile_user': profile_user,
        'posts_count': posts_count,
        'is_own_profile': is_own_profile,
    })

@login_required
def edit_profile_view(request):
    profile, created = Profile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        form = ProfileEditForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            return redirect('profile', username=request.user.username)
    else:
        form = ProfileEditForm(instance=profile)

    return render(request, 'core/edit_profile.html', {
        'form': form,
        'profile': profile
    })