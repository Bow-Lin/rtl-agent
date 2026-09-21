`timescale 1ns/1ps
module tb;
  logic a_clk = 0;
  logic b_clk = 0;
  logic a_rst = 1;
  logic b_rst = 1;
  logic [7:0] a_d = 0;
  logic a_wr = 0;
  logic a_rd = 0;
  logic [7:0] b_d = 0;
  logic b_wr = 0;
  logic b_rd = 0;
  wire a_fifo_full, a_fifo_empty, b_fifo_full, b_fifo_empty;
  wire [7:0] a_q, b_q;

  always #5 a_clk = ~a_clk;
  always #7 b_clk = ~b_clk;

  TopModule #(.data_width(8), .addr_width(2)) dut (
    .a_d(a_d), .a_wr(a_wr), .a_fifo_full(a_fifo_full),
    .a_q(a_q), .a_rd(a_rd), .a_fifo_empty(a_fifo_empty),
    .a_clk(a_clk), .a_rst(a_rst),
    .b_d(b_d), .b_wr(b_wr), .b_fifo_full(b_fifo_full),
    .b_q(b_q), .b_rd(b_rd), .b_fifo_empty(b_fifo_empty),
    .b_clk(b_clk), .b_rst(b_rst)
  );

  // Target preparation checks only meaningful data at accepted reads.
  // The earlier baseline checker/fixture remains unchanged on disk.
  integer rounds;

  task automatic write_a(input logic [7:0] value);
    @(negedge a_clk); a_d = value; a_wr = 1;
    @(negedge a_clk); a_wr = 0;
  endtask
  task automatic write_b(input logic [7:0] value);
    @(negedge b_clk); b_d = value; b_wr = 1;
    @(negedge b_clk); b_wr = 0;
  endtask
  task automatic read_b_expect(input logic [7:0] expected);
    wait (!b_fifo_empty);
    @(negedge b_clk); b_rd = 1;
    @(posedge b_clk); #1;
    if (b_q !== expected) $fatal(1, "FIFO A-to-B mismatch: got %02h expected %02h", b_q, expected);
    @(negedge b_clk); b_rd = 0;
  endtask
  task automatic read_a_expect(input logic [7:0] expected);
    wait (!a_fifo_empty);
    @(negedge a_clk); a_rd = 1;
    @(posedge a_clk); #1;
    if (a_q !== expected) $fatal(1, "FIFO B-to-A mismatch: got %02h expected %02h", a_q, expected);
    @(negedge a_clk); a_rd = 0;
  endtask

  initial begin
    repeat (4) @(posedge a_clk);
    repeat (4) @(posedge b_clk);
    a_rst = 0;
    b_rst = 0;
    repeat (3) @(posedge b_clk);
    if (!b_fifo_empty || !a_fifo_empty) $fatal(1, "FIFO not empty after reset");
    write_a(8'h3c);
    read_b_expect(8'h3c);
    write_b(8'ha7);
    read_a_expect(8'ha7);
    for(rounds=0;rounds<32;rounds=rounds+1) begin
      write_a(8'(rounds)); read_b_expect(8'(rounds));
      write_b(8'(rounds^8'ha5)); read_a_expect(8'(rounds^8'ha5));
    end
    $display("GOLDEN_PASS versatile-fifo reads=66");
    $finish;
  end

  initial begin
    #20000;
    $fatal(1, "Versatile FIFO baseline timeout");
  end
endmodule
