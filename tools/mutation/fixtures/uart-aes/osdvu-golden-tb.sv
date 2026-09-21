`timescale 1ns/1ps
module tb;
reg clk=0; always #5 clk=~clk;
initial begin #2000000; $fatal(1, "GLOBAL_TIMEOUT"); end

localparam integer BIT_CYCLES=16, STOP_BITS=2;
reg rst=1, rx=1; wire tx;
reg[7:0] patterns[0:7];
integer tx_count=0,rx_count=0,checks=0;
initial begin patterns[0]=8'h00; patterns[1]=8'hff; patterns[2]=8'h55; patterns[3]=8'haa;
 patterns[4]=8'h81; patterns[5]=8'h7e; patterns[6]=8'h13; patterns[7]=8'hc4; end
task automatic ticks(input integer n); repeat(n) @(negedge clk); endtask
task automatic send_rx(input [7:0] value);
 integer bitn;
 begin
  @(negedge clk); rx=0; ticks(BIT_CYCLES);
  for(bitn=0;bitn<8;bitn=bitn+1) begin rx=value[bitn]; ticks(BIT_CYCLES); end
  rx=1; ticks(BIT_CYCLES*STOP_BITS); ticks(BIT_CYCLES);
 end
endtask
// Independent serial decoder: do not use internal DUT shift registers as oracle.
initial begin : tx_monitor
 reg[7:0] decoded; integer bitn;
 wait(!rst);
 forever begin
  @(negedge tx); ticks(BIT_CYCLES/2);
  if(tx!==0) $fatal(1,"TX_START");
  for(bitn=0;bitn<8;bitn=bitn+1) begin ticks(BIT_CYCLES); decoded[bitn]=tx; end
  for(bitn=0;bitn<STOP_BITS;bitn=bitn+1) begin ticks(BIT_CYCLES); if(tx!==1) $fatal(1,"TX_STOP"); end
  if(tx_count>=8 || decoded!==patterns[tx_count]) $fatal(1,"TX_DATA index=%0d got=%h",tx_count,decoded);
  tx_count=tx_count+1;
 end
end
reg push=0; reg[7:0] data=0;
wire received,is_receiving,is_transmitting,recv_error; wire[7:0] rx_byte;
uart #(.CLOCK_DIVIDE(4)) dut(.clk(clk),.rst(rst),.rx(rx),.tx(tx),.transmit(push),.tx_byte(data),.received(received),.rx_byte(rx_byte),.is_receiving(is_receiving),.is_transmitting(is_transmitting),.recv_error(recv_error));
wire busy=is_transmitting; wire valid=received; wire[7:0] received_data=rx_byte;
always @(negedge clk) if(!rst && valid) begin
 if(rx_count>=8 || received_data!==patterns[rx_count]) $fatal(1,"RX_DATA index=%0d got=%h",rx_count,received_data);
 rx_count=rx_count+1;
end
integer i,n;
initial begin
 ticks(8); rst=0; ticks(BIT_CYCLES*3);
 for(i=0;i<8;i=i+1) begin
  n=0; while(busy && n<BIT_CYCLES*20) begin ticks(1); n=n+1; end
  if(busy) $fatal(1,"TX_BUSY_TIMEOUT");
  @(negedge clk); data=patterns[i]; push=1; ticks(1); push=0;
  send_rx(patterns[i]); ticks(BIT_CYCLES*3);
 end
 ticks(BIT_CYCLES*15);
 if(tx_count!=8 || rx_count!=8) $fatal(1,"UART_COUNTS tx=%0d rx=%0d",tx_count,rx_count);
 $display("IP_PREPARATION_PASS osdvu tx=8 rx=8"); $finish;
end
endmodule
