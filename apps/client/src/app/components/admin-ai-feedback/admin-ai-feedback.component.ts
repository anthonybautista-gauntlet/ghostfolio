import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

interface AiFeedbackRow {
  assistantReply: string;
  comment?: string;
  createdAt: string;
  id: string;
  model?: string;
  query: string;
  rating: 'down' | 'up';
  sessionId: string;
  updatedAt: string;
  userId: string;
}

@Component({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule
  ],
  selector: 'gf-admin-ai-feedback',
  styleUrls: ['./admin-ai-feedback.component.scss'],
  templateUrl: './admin-ai-feedback.component.html'
})
export class GfAdminAiFeedbackComponent implements OnInit {
  public dataSource = new MatTableDataSource<AiFeedbackRow>();
  public displayedColumns: string[] = [
    'createdAt',
    'rating',
    'query',
    'assistantReply',
    'comment',
    'userId'
  ];
  public isLoading = false;
  public ratingFilter: '' | 'down' | 'up' = '';
  public totalItems = 0;
  private pageSize = 50;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  public ngOnInit() {
    this.fetchFeedback();
  }

  public onChangePage(event: PageEvent) {
    this.fetchFeedback({ pageIndex: event.pageIndex });
  }

  public onRatingFilterChange() {
    this.fetchFeedback({ pageIndex: 0 });
  }

  private fetchFeedback({
    pageIndex = 0
  }: {
    pageIndex?: number;
  } = {}) {
    this.isLoading = true;
    this.dataService
      .fetchAiAdminFeedback({
        rating: this.ratingFilter || undefined,
        skip: pageIndex * this.pageSize,
        take: this.pageSize
      })
      .subscribe({
        next: ({ count, feedback }) => {
          this.totalItems = count;
          this.dataSource = new MatTableDataSource(feedback);
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
