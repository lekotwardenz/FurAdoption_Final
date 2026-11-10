from django.contrib import admin
from .models import Profile, Inventory, Animal, Post, PostAnimal, PostPhoto, PostLike, PostComment

# Registering models so they can be edited in the admin panel
admin.site.register(Profile)
admin.site.register(Inventory)
admin.site.register(Animal)
admin.site.register(Post)
admin.site.register(PostAnimal)
admin.site.register(PostPhoto)
admin.site.register(PostLike)
admin.site.register(PostComment)