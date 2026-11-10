from django.db import models
from django.contrib.auth.models import User

from django.db.models.signals import post_save
from django.dispatch import receiver

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=100, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username

    @property
    def avatar_url(self):
        if self.profile_picture:
            return self.profile_picture.url
        display_name = self.full_name if self.full_name else self.user.username
        formatted_name = display_name.replace(' ', '+')
        return f"https://ui-avatars.com/api/?name={formatted_name}&background=random&color=fff&size=150"
    
    # Helper to safely get any user's avatar URL without crashing if profile is missing
    def get_user_avatar(user):
        try:
            if hasattr(user, 'profile') and user.profile:
                return user.profile.avatar_url
        except Exception:
            pass
        return f"https://ui-avatars.com/api/?name={user.username}&background=random&color=fff&size=150"


class Inventory(models.Model):
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory')
    shelter_name = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.shelter_name or f"{self.user.username}'s Inventory"


class Animal(models.Model):
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Adopted', 'Adopted'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registered_animals')
    inventory = models.ForeignKey(Inventory, on_delete=models.SET_NULL, null=True, blank=True, related_name='animals')
    name = models.CharField(max_length=50, blank=True, null=True)
    species = models.CharField(max_length=50)
    breed = models.CharField(max_length=50, blank=True, null=True)
    age = models.CharField(max_length=20, blank=True, null=True)
    adoption_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Available')
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name or 'Unnamed'} ({self.species})"


# 4. POSTS
class Post(models.Model):
    POST_TYPES = [
        ('Rescue', 'Rescue'),
        ('Looking to Adopt', 'Looking to Adopt'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    post_type = models.CharField(max_length=30, choices=POST_TYPES)
    caption = models.TextField()
    # Many-to-many relationship using your POST_ANIMALS junction table
    tagged_animals = models.ManyToManyField(Animal, through='PostAnimal', related_name='posts')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Post by {self.user.username} ({self.post_type})"


class PostAnimal(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    animal = models.ForeignKey(Animal, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('post', 'animal')


class PostPhoto(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='photos')
    image_url = models.ImageField(upload_to='post_photos/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo for Post {self.post.id}"


# 7. POST_LIKES
class PostLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post') 

# 8. POST_COMMENTS
class PostComment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on Post {self.post.id}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()