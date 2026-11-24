import json
import os
import uuid
from urllib.parse import urlparse
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from supabase import create_client
from apps.authentication.forms import ProfileEditForm
from apps.authentication.models import (
    Animal,
    Inventory,
    Notification,
    Post,
    PostComment,
    PostLike,
    PostPhoto,
    Profile,
)


def _get_supabase_client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _extract_storage_path(image_url: str, bucket_name: str) -> str | None:
    if not image_url or not bucket_name:
        return None
    marker = f"/object/public/{bucket_name}/"
    parsed = urlparse(image_url)
    if marker in parsed.path:
        return parsed.path.split(marker, 1)[1]
    return None


def toggle_like(request, post_id):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'message': 'Log in to like posts.'})

        post = get_object_or_404(Post, id=post_id)

        like_exists = PostLike.objects.filter(user=request.user, post=post).first()

        if like_exists:
            like_exists.delete()
            liked = False
        else:
            PostLike.objects.create(user=request.user, post=post)
            liked = True
            if post.user != request.user:
                Notification.objects.create(
                    recipient=post.user,
                    sender=request.user,
                    post=post,
                    notif_type='like',
                    message=f"{request.user.username} liked your post."
                )

        return JsonResponse({
            'success': True,
            'liked': liked,
            'like_count': post.likes.count()
        })

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


def add_comment(request, post_id):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'message': 'Log in to comment.'})

        data = json.loads(request.body)
        text = (data.get('comment_text') or '').strip()

        if not text:
            return JsonResponse({'success': False, 'message': 'Comment cannot be empty.'})

        post = get_object_or_404(Post, id=post_id)

        comment = PostComment.objects.create(user=request.user, post=post, content=text)

        comment = PostComment.objects.create(user=request.user, post=post, content=text)

        if post.user != request.user:
            Notification.objects.create(
                recipient=post.user,
                sender=request.user,
                post=post,
                notif_type='comment',
                message=f"{request.user.username} commented on your post."
            )

        return JsonResponse({
            'success': True,
            'username': comment.user.username,
            'date': comment.created_at.strftime("%B %d, %Y"),
            'text': comment.content,
            'comment_count': post.comments.count(),
            'avatar_url': request.user.profile.avatar_url
        })

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


def home_view(request):
    posts = (
        Post.objects.select_related('user__profile')
        .prefetch_related('photos', 'likes', 'comments__user__profile')
        .order_by('-created_at')
    )

    liked_post_ids = []
    if request.user.is_authenticated:
        liked_post_ids = list(
            PostLike.objects.filter(user=request.user).values_list('post_id', flat=True)
        )

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

            if images:
                supabase = _get_supabase_client()
                bucket_name = settings.SUPABASE_STORAGE_BUCKET

                for image in images:
                    ext = os.path.splitext(image.name)[1].lower() or '.jpg'
                    storage_path = f"posts/{new_post.id}/{uuid.uuid4().hex}{ext}"
                    file_bytes = image.read()

                    supabase.storage.from_(bucket_name).upload(
                        path=storage_path,
                        file=file_bytes,
                        file_options={"content-type": image.content_type or "image/jpeg"}
                    )

                    public_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)

                    PostPhoto.objects.create(
                        post=new_post,
                        image_url=public_url
                    )

            return JsonResponse({'success': True, 'message': 'Post and photos successfully saved!'})

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


@login_required
def delete_post(request, post_id):
    if request.method == 'POST':
        post = get_object_or_404(Post, id=post_id)

        if post.user != request.user:
            return JsonResponse(
                {'success': False, 'message': 'You do not have permission to delete this post.'},
                status=403
            )

        try:
            storage_paths = []
            for photo in post.photos.all():
                path = _extract_storage_path(photo.image_url, settings.SUPABASE_STORAGE_BUCKET)
                if path:
                    storage_paths.append(path)

            if storage_paths and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
                supabase = _get_supabase_client()
                supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove(storage_paths)

            post.delete()
            return JsonResponse({'success': True, 'post_id': post_id})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)


def profile_view(request, username):
    profile_user = get_object_or_404(User, username=username)
    is_own_profile = request.user.is_authenticated and request.user == profile_user

    user_posts = (
        Post.objects.filter(user=profile_user)
        .select_related('user__profile')
        .prefetch_related('photos', 'likes', 'comments__user__profile')
        .order_by('-created_at')
    )

    liked_post_ids = []
    if request.user.is_authenticated:
        liked_post_ids = list(
            PostLike.objects.filter(user=request.user).values_list('post_id', flat=True)
        )

    try:
        user_inventory = profile_user.inventory
        animals = list(user_inventory.animals.filter(is_archived=False).order_by('-created_at'))
    except ObjectDoesNotExist:
        user_inventory = None
        animals = []

    return render(request, 'core/profile.html', {
        'profile_user': profile_user,
        'posts': user_posts,
        'posts_count': user_posts.count(),
        'liked_post_ids': liked_post_ids,
        'is_own_profile': is_own_profile,
        'user_inventory': user_inventory,
        'animals': animals,
        'animals_count': len(animals),
    })


@login_required
def create_inventory(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        shelter_name = (data.get('shelter_name') or '').strip()

        inventory, created = Inventory.objects.get_or_create(
            user=request.user,
            defaults={'shelter_name': shelter_name or f"{request.user.username}'s Inventory"}
        )
        if not created:
            return JsonResponse({'success': False, 'message': 'You already have an inventory.'})

        return JsonResponse({
            'success': True,
            'shelter_name': inventory.shelter_name
        })

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


@login_required
def add_animal(request):
    if request.method == 'POST':
        try:
            inventory = request.user.inventory
        except ObjectDoesNotExist:
            return JsonResponse({'success': False, 'message': 'Create an inventory first.'})

        data = json.loads(request.body)
        species = (data.get('species') or '').strip()

        if not species:
            return JsonResponse({'success': False, 'message': 'Species is required.'})

        animal = Animal.objects.create(
            user=request.user,
            inventory=inventory,
            name=(data.get('name') or '').strip() or None,
            species=species,
            breed=(data.get('breed') or '').strip() or None,
            age=(data.get('age') or '').strip() or None,
            adoption_status=data.get('adoption_status', 'Available'),
        )

        return JsonResponse({
            'success': True,
            'animal': {
                'id': animal.id,
                'name': animal.name or 'Unnamed',
                'species': animal.species,
                'breed': animal.breed or '—',
                'age': animal.age or '—',
                'adoption_status': animal.adoption_status,
            }
        })

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


@login_required
def toggle_animal_status(request, animal_id):
    if request.method == 'POST':
        animal = get_object_or_404(Animal, id=animal_id, user=request.user)
        animal.adoption_status = 'Adopted' if animal.adoption_status == 'Available' else 'Available'
        animal.save()
        return JsonResponse({'success': True, 'adoption_status': animal.adoption_status})

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


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

@login_required
def get_notifications(request):
    notifs = (
        Notification.objects.filter(recipient=request.user)
        .select_related('sender__profile')[:20]
    )
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

    items = [
        {
            'id': n.id,
            'message': n.message,
            'is_read': n.is_read,
            'post_id': n.post_id,
            'date': n.created_at.strftime("%b %d, %Y"),
            'avatar_url': Profile.get_user_avatar(n.sender),
        }
        for n in notifs
    ]

    return JsonResponse({
        'success': True,
        'unread_count': unread_count,
        'notifications': items,
    })


@login_required
def mark_notifications_read(request):
    if request.method == 'POST':
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return JsonResponse({'success': True, 'unread_count': 0})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)