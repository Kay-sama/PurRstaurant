import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface RestaurantInfo {
  name: string;
  address: string;
  phone: string;
  description: string;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  protected readonly restaurantInfo = signal<RestaurantInfo | null>(null);
  protected readonly menu = signal<MenuItem[]>([]);

  ngOnInit() {
    this.http.get<RestaurantInfo>(`${this.baseUrl}/restaurant/info`)
      .subscribe(info => this.restaurantInfo.set(info));

    this.http.get<MenuItem[]>(`${this.baseUrl}/menu`)
      .subscribe(menu => this.menu.set(menu));
  }
}
