from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('create-post/', views.create_post, name='create_post'),
    
    # New interactive endpoints for likes and comments
    path('toggle-like/<int:post_id>/', views.toggle_like, name='toggle_like'),
    path('add-comment/<int:post_id>/', views.add_comment, name='add_comment'),
    
    # Put 'profile/edit/' BEFORE 'profile/<str:username>/'
    path('profile/edit/', views.edit_profile_view, name='edit_profile'),
    path('profile/<str:username>/', views.profile_view, name='profile'),
]