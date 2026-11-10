from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    # The Register Page (points to the custom view you made in views.py)
    path('register/', views.register, name='register'),
    
    # The Login Page (uses Django's built-in secure login system)
    path('login/', auth_views.LoginView.as_view(template_name='authentication/login/login.html'), name='login'),
    
    # The Logout Page
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
]